// Ferramenta "extrato_de_pontos": de onde vieram os pontos da competição do PRÓPRIO usuário.
// A pontuação é a do servidor (get_my_points_statement, a mesma da tela /competicao/extrato): aqui só
// se traduz para o modelo. A função lê auth.uid() do token do usuário, então não há como pedir os
// pontos de outra pessoa; o limite do plano (temporadas anteriores no Free) também vem do banco.
// Minimização: treinos viram referências ("treino-1"), sem ids do banco.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { tool } from "npm:ai@7.0.131";
import { z } from "npm:zod@4.6.5";
import { seasonRange, seasonStart } from "./season.ts";
import { toUnit, type WeightUnit } from "./units.ts";

const MAX_RANGE_DAYS = 400;
const DAY_MS = 86_400_000;
const ISO_MONTH = z.string().regex(/^\d{4}-\d{2}$/);
const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

interface StatementWeekRow {
  week_start: string;
  points: number;
  constancy_points: number;
  bonus_points: number;
  record_points: number;
  volume_points: number;
  valid_sessions: number;
  weekly_volume: number;
  records: number;
  fulfilled: boolean;
}

interface StatementSessionRow {
  session_id: string;
  name: string | null;
  day: string;
  week_start: string;
  minutes: number;
  is_valid: boolean;
  counted: boolean;
  records: number;
}

interface StatementRow {
  visible_from: string;
  weeks: StatementWeekRow[] | null;
  sessions: StatementSessionRow[] | null;
}

export interface PointsStatementContext {
  db: SupabaseClient;
  unit: WeightUnit;
  today: string;
  /** Referência curta do treino, compartilhada com as outras ferramentas (detalhe_do_treino a aceita). */
  refFor: (sessionId: string) => string;
}

type WeekPart = "points" | "constancy_points" | "bonus_points" | "record_points" | "volume_points";

// numeric do Postgres pode chegar como texto pelo PostgREST.
const round1 = (value: number | string) => Math.round(Number(value) * 10) / 10;
const sumPart = (weeks: StatementWeekRow[], part: WeekPart) => round1(weeks.reduce((total, w) => total + Number(w[part]), 0));

/** Por que o treino rendeu (ou não) os pontos de constância do dia. */
function sessionOutcome(session: StatementSessionRow): string {
  if (session.counted) return "contou para a constância";
  if (!session.is_valid) return "não contou: tempo efetivo abaixo do mínimo";
  return "não contou: outro treino do mesmo dia teve mais volume";
}

function toWeek(week: StatementWeekRow, unit: WeightUnit) {
  return {
    semana_de: week.week_start,
    pontos: round1(week.points),
    constancia: round1(week.constancy_points),
    sequencia: round1(week.bonus_points),
    recordes: round1(week.record_points),
    volume: round1(week.volume_points),
    dias_validos: week.valid_sessions,
    recordes_batidos: week.records,
    volume_da_semana: toUnit(Number(week.weekly_volume), unit),
    semana_cumprida: week.fulfilled,
  };
}

/** Período pedido: um intervalo de datas, um mês (temporada) ou, sem nada, a temporada atual. */
function resolveRange(today: string, month?: string, from?: string, to?: string) {
  if (from && to) return { from, to };
  return seasonRange(month ? `${month}-01` : seasonStart(today));
}

/** Ferramentas do extrato de pontos (presas ao usuário do token). */
export function buildPointsStatementTools({ db, unit, today, refFor }: PointsStatementContext) {
  return {
    extrato_de_pontos: tool({
      description:
        "Extrato de pontos da competição do PRÓPRIO usuário: total do período, quanto veio de constância, sequência, recordes e volume, os pontos de cada semana e cada treino (se contou ou por que não contou). Use para perguntas como quantos pontos fiz este mês, de onde vieram meus pontos ou por que um treino não pontuou. Sem parâmetros = temporada atual (o mês). Não traz pontos nem posição de outras pessoas.",
      inputSchema: z.object({
        mes: ISO_MONTH.optional().describe("Temporada AAAA-MM (semanas cujo sábado cai no mês)."),
        de: ISO_DATE.optional().describe("Início de um intervalo (AAAA-MM-DD), junto com ate."),
        ate: ISO_DATE.optional().describe("Fim do intervalo (AAAA-MM-DD)."),
      }),
      execute: async ({ mes, de, ate }) => {
        const range = resolveRange(today, mes, de, ate);
        if (range.from > range.to) return { erro: "A data inicial é depois da final." };
        if ((Date.parse(range.to) - Date.parse(range.from)) / DAY_MS > MAX_RANGE_DAYS) {
          return { erro: `O período pode ter no máximo ${MAX_RANGE_DAYS} dias.` };
        }
        const { data, error } = await db.rpc("get_my_points_statement", { p_from: range.from, p_to: range.to });
        if (error || !data) return { erro: "Não foi possível ler o extrato de pontos agora." };
        const statement = data as StatementRow;
        const weeks = statement.weeks ?? [];
        return {
          periodo: range,
          ...(statement.visible_from > range.from
            ? { aviso_do_plano: `O plano do usuário mostra a competição só a partir de ${statement.visible_from}; temporadas anteriores fazem parte do Pro.` }
            : {}),
          total: sumPart(weeks, "points"),
          por_origem: {
            constancia: sumPart(weeks, "constancy_points"),
            sequencia: sumPart(weeks, "bonus_points"),
            recordes: sumPart(weeks, "record_points"),
            volume: sumPart(weeks, "volume_points"),
          },
          semanas: weeks.map((week) => toWeek(week, unit)),
          treinos: (statement.sessions ?? []).map((session) => ({
            ref: refFor(session.session_id),
            nome: session.name ?? "Treino livre",
            data: session.day,
            semana_de: session.week_start,
            minutos: session.minutes,
            situacao: sessionOutcome(session),
            recordes: session.records,
          })),
        };
      },
    }),
  };
}
