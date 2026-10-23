// Ferramentas de leitura do GUF AI. Todas usam o cliente com o token do usuário (RLS) E filtram por
// user_id: mesmo que uma política de leitura um dia se abra (ex.: seguidores), a IA só vê o dono.
// Fora de propósito: medidas corporais (dado de saúde) e observações (texto livre, pode ter saúde).
// Minimização (LGPD art. 6º, III): nada que identifique a pessoa vai para o modelo — sem nome, e-mail,
// fuso ou ids do banco. Treinos viram referências curtas ("treino-1") traduzidas só aqui no servidor.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { tool } from "npm:ai@7.0.131";
import { z } from "npm:zod@4.6.5";
import { buildPointsStatementTools } from "./points-statement.ts";
import { seasonStart } from "./season.ts";
import { toUnit, type WeightUnit } from "./units.ts";

export type { WeightUnit } from "./units.ts";

const ISO_WEEKDAYS = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const DEFAULT_WORKOUTS = 8;
const MAX_WORKOUTS = 20;
const MAX_EXERCISE_MATCHES = 5;
const MAX_ALTERNATIVES = 30;
const DEFAULT_WEEKS = 12;
const DAY_MS = 86_400_000;

export interface ToolsContext {
  db: SupabaseClient;
  userId: string;
  unit: WeightUnit;
  today: string;
}

interface SetRow {
  weight_kg: number | null;
  reps: number | null;
  set_type: string;
  is_completed: boolean;
}

interface SessionRow {
  id: string;
  status: string;
  name: string | null;
  performed_on: string;
  active_seconds: number | null;
  started_at: string;
  finished_at: string | null;
  session_exercises: { position: number; exercises: { name: string } | null; set_logs: SetRow[] }[];
}

const SESSION_SELECT =
  "id, status, name, performed_on, active_seconds, started_at, finished_at, session_exercises(position, exercises(name), set_logs(weight_kg, reps, set_type, is_completed))";

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Texto do usuário dentro de um filtro do PostgREST: sem curingas nem separadores de filtro. */
const toSearchTerm = (text: string) => text.replace(/[%_,()*]/g, "").trim();

const durationMinutes = (row: SessionRow) => {
  const seconds = row.active_seconds ??
    (row.finished_at ? (Date.parse(row.finished_at) - Date.parse(row.started_at)) / 1000 : null);
  return seconds === null ? null : Math.round(seconds / 60);
};

/** Séries que contam (concluídas e sem aquecimento), como no resumo do app. */
const workingSets = (sets: SetRow[]) => sets.filter((s) => s.is_completed && s.set_type !== "warmup");

function bestSet(sets: SetRow[], unit: WeightUnit) {
  const best = [...sets].sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
  return best ? { carga: toUnit(best.weight_kg, unit), repeticoes: best.reps } : null;
}

function summarizeSession(row: SessionRow, ref: string, unit: WeightUnit, withSets: boolean) {
  const exercises = [...row.session_exercises].sort((a, b) => a.position - b.position).map((e, index) => {
    const sets = workingSets(e.set_logs);
    const volume = sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
    return {
      ordem: index + 1,
      exercicio: e.exercises?.name ?? "Exercício",
      series_concluidas: sets.length,
      volume: toUnit(volume, unit),
      ...(withSets
        ? { series: sets.map((s) => ({ carga: toUnit(s.weight_kg, unit), repeticoes: s.reps })) }
        : { melhor_serie: bestSet(sets, unit) }),
    };
  });
  return {
    ref,
    nome: row.name ?? "Treino livre",
    situacao: row.status === "in_progress" ? "em andamento" : "concluído",
    data: row.performed_on,
    duracao_min: durationMinutes(row),
    volume_total: toUnit(exercises.reduce((sum, e) => sum + (e.volume ?? 0), 0), unit),
    exercicios: exercises,
  };
}

interface CompetitionParametersRow {
  sessions_for_max_constancy: number;
  constancy_points_per_day: number;
  min_minutes: number;
  bonus_per_week: number;
  bonus_max: number;
  record_points: number;
  records_max: number;
  volume_max: number;
  volume_window_weeks: number;
}

/** Monta as ferramentas de um usuário (o contexto fica preso aqui; o modelo não escolhe de quem lê). */
export function buildDataTools({ db, userId, unit, today }: ToolsContext) {
  const sessionRefs = new Map<string, string>();
  const refFor = (sessionId: string) => {
    const known = [...sessionRefs].find(([, id]) => id === sessionId)?.[0];
    if (known) return known;
    const ref = `treino-${sessionRefs.size + 1}`;
    sessionRefs.set(ref, sessionId);
    return ref;
  };
  const catalog = () =>
    db.from("exercises").select("id, name, muscle_group, equipment")
      .or(`user_id.is.null,user_id.eq.${userId}`).is("archived_at", null);

  return {
    resumo_da_conta: tool({
      description:
        "Visão geral do usuário: unidade de peso, meta semanal, sequência de semanas, total de treinos, primeiro e último treino e o projeto ativo com as rotinas e os dias.",
      inputSchema: z.object({}),
      execute: async () => {
        const [profile, streak, count, first, last, project] = await Promise.all([
          db.from("profiles").select("weekly_goal").eq("id", userId).maybeSingle(),
          db.rpc("get_streak"),
          db.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
          db.from("workout_sessions").select("performed_on").eq("user_id", userId).eq("status", "completed").order("performed_on").limit(1).maybeSingle(),
          db.from("workout_sessions").select("name, performed_on").eq("user_id", userId).eq("status", "completed").order("finished_at", { ascending: false }).limit(1).maybeSingle(),
          db.from("projects").select("name, routines(name, weekdays, position, archived_at)").eq("user_id", userId).eq("is_active", true).maybeSingle(),
        ]);
        const s = (streak.data as { current_streak: number; best_streak: number; current_week_count: number }[] | null)?.[0];
        const routines = ((project.data?.routines ?? []) as { name: string; weekdays: number[]; position: number; archived_at: string | null }[])
          .filter((r) => !r.archived_at)
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ rotina: r.name, dias: r.weekdays.map((d) => ISO_WEEKDAYS[d]) }));
        return {
          hoje: today,
          unidade_de_peso: unit,
          meta_semanal_de_treinos: profile.data?.weekly_goal ?? null,
          sequencia_semanas: s?.current_streak ?? 0,
          melhor_sequencia_semanas: s?.best_streak ?? 0,
          treinos_nesta_semana: s?.current_week_count ?? 0,
          total_de_treinos: count.count ?? 0,
          primeiro_treino: first.data?.performed_on ?? null,
          ultimo_treino: last.data ? { nome: last.data.name, data: last.data.performed_on } : null,
          projeto_ativo: project.data ? { nome: project.data.name, rotinas: routines } : null,
        };
      },
    }),

    treinos_recentes: tool({
      description:
        "Treinos do usuário (concluídos e o em andamento), do mais recente para o mais antigo, com os exercícios na ordem feita (campo 'ordem'), duração, volume e a melhor série de cada um. Para 'hoje', use de = ate = a data de hoje.",
      inputSchema: z.object({
        de: ISO_DATE.optional().describe("Data inicial (AAAA-MM-DD)"),
        ate: ISO_DATE.optional().describe("Data final (AAAA-MM-DD)"),
        limite: z.number().int().min(1).max(MAX_WORKOUTS).optional().describe(`Quantos treinos (padrão ${DEFAULT_WORKOUTS})`),
      }),
      execute: async ({ de, ate, limite }) => {
        let query = db.from("workout_sessions").select(SESSION_SELECT)
          .eq("user_id", userId).in("status", ["completed", "in_progress"])
          .order("started_at", { ascending: false }).limit(limite ?? DEFAULT_WORKOUTS);
        if (de) query = query.gte("performed_on", de);
        if (ate) query = query.lte("performed_on", ate);
        const { data, error } = await query;
        if (error) return { erro: "Não foi possível ler os treinos agora." };
        const rows = (data ?? []) as unknown as SessionRow[];
        return { unidade: unit, treinos: rows.map((row) => summarizeSession(row, refFor(row.id), unit, false)) };
      },
    }),

    detalhe_do_treino: tool({
      description: "Todas as séries feitas (carga e repetições) de um treino, pela referência (ex.: treino-1) recebida de treinos_recentes nesta resposta.",
      inputSchema: z.object({ ref: z.string().regex(/^treino-\d+$/) }),
      execute: async ({ ref }) => {
        const sessionId = sessionRefs.get(ref);
        if (!sessionId) return { erro: "Referência desconhecida. Chame treinos_recentes primeiro." };
        const { data } = await db.from("workout_sessions").select(SESSION_SELECT)
          .eq("user_id", userId).eq("id", sessionId).maybeSingle();
        if (!data) return { erro: "Treino não encontrado." };
        return { unidade: unit, treino: summarizeSession(data as unknown as SessionRow, ref, unit, true) };
      },
    }),

    exercicios_treinados: tool({
      description: "Exercícios que o usuário já treinou, com o número de treinos e a data do último. Use para achar o nome certo de um exercício.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await db.from("session_exercises")
          .select("exercises(name), workout_sessions!inner(performed_on, status)")
          .eq("user_id", userId).eq("workout_sessions.status", "completed");
        const byName = new Map<string, { treinos: number; ultimo: string }>();
        for (const row of (data ?? []) as unknown as { exercises: { name: string } | null; workout_sessions: { performed_on: string } }[]) {
          const name = row.exercises?.name;
          if (!name) continue;
          const entry = byName.get(name) ?? { treinos: 0, ultimo: "" };
          entry.treinos += 1;
          if (row.workout_sessions.performed_on > entry.ultimo) entry.ultimo = row.workout_sessions.performed_on;
          byName.set(name, entry);
        }
        return {
          exercicios: [...byName]
            .sort((a, b) => b[1].treinos - a[1].treinos)
            .map(([exercicio, e]) => ({ exercicio, treinos: e.treinos, ultimo: e.ultimo })),
        };
      },
    }),

    evolucao_do_exercicio: tool({
      description:
        "Evolução de um exercício do usuário por treino: carga máxima, 1RM estimado (Epley), volume e repetições, mais os recordes. Informe o nome (ou parte dele).",
      inputSchema: z.object({
        exercicio: z.string().min(2).max(80).describe("Nome do exercício, ex.: supino reto"),
        semanas: z.number().int().min(1).max(104).optional().describe(`Quantas semanas para trás (padrão ${DEFAULT_WEEKS})`),
      }),
      execute: async ({ exercicio, semanas }) => {
        const { data: trained } = await db.from("session_exercises")
          .select("exercise_id, exercises!inner(name)")
          .eq("user_id", userId).ilike("exercises.name", `%${toSearchTerm(exercicio)}%`)
          .limit(200);
        const matches = new Map<string, string>();
        for (const row of (trained ?? []) as unknown as { exercise_id: string; exercises: { name: string } }[]) {
          matches.set(row.exercise_id, row.exercises.name);
        }
        if (matches.size === 0) return { erro: `Nenhum exercício treinado com "${exercicio}". Use exercicios_treinados para ver os nomes.` };
        if (matches.size > MAX_EXERCISE_MATCHES) {
          return { erro: "Nome muito genérico. Escolha um destes:", opcoes: [...matches.values()].slice(0, 12) };
        }
        const from = new Date(Date.parse(today) - (semanas ?? DEFAULT_WEEKS) * 7 * DAY_MS).toISOString().slice(0, 10);
        const results = await Promise.all([...matches].map(async ([id, name]) => {
          const [history, records] = await Promise.all([
            db.rpc("get_exercise_history", { p_exercise_id: id, p_from: from }),
            db.rpc("get_exercise_records", { p_exercise_id: id }),
          ]);
          const rows = (history.data ?? []) as { performed_on: string; max_weight_kg: number; best_e1rm_kg: number; total_volume_kg: number; total_reps: number; total_sets: number }[];
          type RecordJson = { value: number | null; performed_on: string } | null;
          const rec = (records.data ?? {}) as { max_weight?: RecordJson; best_e1rm?: RecordJson };
          const toRecord = (r: RecordJson | undefined) =>
            r?.value == null ? null : { valor: toUnit(Number(r.value), unit), data: r.performed_on };
          return {
            exercicio: name,
            recordes: { maior_carga: toRecord(rec.max_weight), maior_1rm_estimado: toRecord(rec.best_e1rm) },
            treinos: rows.map((r) => ({
              data: r.performed_on,
              carga_maxima: toUnit(r.max_weight_kg, unit),
              rm1_estimado: toUnit(r.best_e1rm_kg, unit),
              volume: toUnit(r.total_volume_kg, unit),
              series: r.total_sets,
              repeticoes: r.total_reps,
            })),
          };
        }));
        return { unidade: unit, desde: from, resultados: results };
      },
    }),

    alternativas_de_exercicio: tool({
      description:
        "Exercícios do catálogo do app que trabalham o mesmo grupo muscular de um exercício, com o equipamento. Use para sugerir substituições e só sugira exercícios desta lista.",
      inputSchema: z.object({ exercicio: z.string().min(2).max(80).describe("Nome do exercício a substituir") }),
      execute: async ({ exercicio }) => {
        const { data: found } = await catalog().ilike("name", `%${toSearchTerm(exercicio)}%`).order("name").limit(1);
        const target = (found ?? [])[0] as { id: string; name: string; muscle_group: string } | undefined;
        if (!target) return { erro: `Exercício "${exercicio}" não encontrado no catálogo.` };
        const { data: same } = await catalog().eq("muscle_group", target.muscle_group).neq("id", target.id).order("name").limit(MAX_ALTERNATIVES);
        return {
          exercicio: target.name,
          grupo_muscular: target.muscle_group,
          alternativas: ((same ?? []) as { name: string; equipment: string }[]).map((e) => ({ exercicio: e.name, equipamento: e.equipment })),
        };
      },
    }),

    rotinas: tool({
      description: "Rotinas do usuário (projeto ativo primeiro) com os exercícios planejados: séries, repetições alvo, descanso e carga planejada.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await db.from("routines")
          .select("name, weekdays, position, auto_progress, projects(name, is_active), routine_exercises(position, target_sets, target_reps, rest_seconds, target_weight_kg, exercises(name))")
          .eq("user_id", userId).is("archived_at", null);
        type RoutineRow = {
          name: string; weekdays: number[]; position: number; auto_progress: boolean;
          projects: { name: string; is_active: boolean } | null;
          routine_exercises: { position: number; target_sets: number | null; target_reps: string | null; rest_seconds: number | null; target_weight_kg: number | null; exercises: { name: string } | null }[];
        };
        const rows = ((data ?? []) as unknown as RoutineRow[])
          .sort((a, b) => Number(b.projects?.is_active ?? false) - Number(a.projects?.is_active ?? false) || a.position - b.position);
        return {
          unidade: unit,
          rotinas: rows.map((r) => ({
            rotina: r.name,
            projeto: r.projects?.name ?? null,
            projeto_ativo: r.projects?.is_active ?? false,
            dias: r.weekdays.map((d) => ISO_WEEKDAYS[d]),
            carga_automatica: r.auto_progress,
            exercicios: [...r.routine_exercises].sort((a, b) => a.position - b.position).map((e) => ({
              exercicio: e.exercises?.name ?? "Exercício",
              series: e.target_sets,
              repeticoes: e.target_reps,
              descanso_s: e.rest_seconds,
              carga_planejada: r.auto_progress ? null : toUnit(e.target_weight_kg, unit),
            })),
          })),
        };
      },
    }),

    regras_da_competicao: tool({
      description:
        "Regras da competição do app com os valores vigentes: o que é treino válido, como os pontos da semana são somados (constância, sequência, recordes e volume), máximo semanal e desempate. Não traz pontos nem posição de ninguém.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await db.from("competition_parameters")
          .select("sessions_for_max_constancy, constancy_points_per_day, min_minutes, bonus_per_week, bonus_max, record_points, records_max, volume_max, volume_window_weeks")
          .lte("effective_from", seasonStart(today))
          .order("effective_from", { ascending: false }).limit(1).maybeSingle();
        if (!data) return { erro: "Não foi possível ler as regras da competição agora." };
        // numeric do Postgres chega como texto pelo PostgREST.
        const p = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Number(v)])) as unknown as CompetitionParametersRow;
        return {
          treino_valido: `pelo menos ${p.min_minutes} minutos de tempo efetivo (tempo medido, sem pausas); no máximo 1 por dia (o de maior volume)`,
          semana: "domingo a sábado; o dia é o do início do treino",
          temporada: "o mês; uma semana pertence ao mês do sábado em que termina",
          constancia: `${p.constancy_points_per_day} pontos por dia com treino válido, todos os dias da semana (sem limite de dias); é o que mais pesa`,
          sequencia: `semana com ${p.sessions_for_max_constancy} ou mais dias de treino válido é "cumprida"; ${p.bonus_per_week} pontos × semanas cumpridas seguidas, até ${p.bonus_max}; zera numa semana não cumprida e continua entre temporadas`,
          recordes: `${p.record_points} pontos por recorde batido na semana (maior 1RM estimado de um exercício: mais carga ou mais repetições com a mesma carga), até ${p.records_max}; a primeira vez de um exercício não é recorde`,
          volume: `até ${p.volume_max} pontos: ${p.volume_max} × (volume da semana ÷ média das suas últimas ${p.volume_window_weeks} semanas com treino), limitado a ${p.volume_max}; sem histórico, ${p.volume_max} se treinou`,
          limite_por_semana: "sem máximo: cada dia treinado soma; recordes e volume têm limite próprio",
          desempate: "mais semanas cumpridas, depois mais treinos válidos, depois mais volume",
        };
      },
    }),
    ...buildPointsStatementTools({ db, unit, today, refFor }),
  };
}
