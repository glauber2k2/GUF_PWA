import { differenceInCalendarDays, format, getWeek, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  addLocalDays,
  formatShortDate,
  fromLocalISODate,
  startOfLocalWeek,
  toLocalISODate,
  WEEK_STARTS_ON,
  WEEKDAY_INITIALS,
  WEEKDAY_SHORT_NAMES,
  weekdayPosition,
} from "./dates";
import { formatNumber, formatSigned, TIMES_SIGN } from "./format";
import type { SetType } from "./training";
import { toDisplayWeight, type WeightUnit } from "./units";
import { liftEffort, pickWeightComparison, type LiftEffort, type WeightComparison } from "./weight-comparison";

/*
 * Imagens de compartilhamento (stories 1080 × 1920, Claude Design "StoryArt"/"ShareSheetScreen").
 * Regras puras: recebe o resumo do treino e o contexto (sequência, dias treinados, séries do mês)
 * e devolve os textos e números prontos para os modelos. Pesos convertidos para a unidade do usuário.
 */

/* ---------------------------------------------------------------------
 * Mapa muscular dos stories (boneco frente/costas)
 * --------------------------------------------------------------------- */

/** Regiões do boneco do story (Claude Design "StoryArt"). */
export type StoryMuscle =
  | "peito"
  | "ombro"
  | "costas"
  | "trapezio"
  | "abdomen"
  | "biceps"
  | "triceps"
  | "antebraco"
  | "gluteos"
  | "quadriceps"
  | "posterior"
  | "panturrilha";

/** Intensidade da região: 1 (leve) a 3 (principal). */
export type StoryMuscleLevels = Partial<Record<StoryMuscle, 1 | 2 | 3>>;

/** Código do banco (exercises.muscle_group) → região do boneco; corpo inteiro e cardio não pintam. */
const MUSCLE_TO_STORY: Record<string, StoryMuscle | undefined> = {
  peito: "peito",
  costas: "costas",
  ombros: "ombro",
  biceps: "biceps",
  triceps: "triceps",
  antebraco: "antebraco",
  quadriceps: "quadriceps",
  posterior: "posterior",
  gluteos: "gluteos",
  panturrilha: "panturrilha",
  abdomen: "abdomen",
};

const STORY_MUSCLE_LABEL: Record<StoryMuscle, string> = {
  peito: "Peito",
  ombro: "Ombro",
  costas: "Costas",
  trapezio: "Trapézio",
  abdomen: "Abdômen",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  gluteos: "Glúteos",
  quadriceps: "Quadríceps",
  posterior: "Posterior",
  panturrilha: "Panturrilha",
};

/** Séries por região → nível 1–3 proporcional ao grupo mais treinado. */
export function storyMuscleLevels(setsByGroup: ReadonlyArray<{ muscleGroup: string; sets: number }>): StoryMuscleLevels {
  const totals = new Map<StoryMuscle, number>();
  for (const { muscleGroup, sets } of setsByGroup) {
    const key = MUSCLE_TO_STORY[muscleGroup];
    if (key && sets > 0) totals.set(key, (totals.get(key) ?? 0) + sets);
  }
  const max = Math.max(0, ...totals.values());
  const levels: StoryMuscleLevels = {};
  for (const [key, sets] of totals) levels[key] = Math.min(3, Math.max(1, Math.ceil((3 * sets) / max))) as 1 | 2 | 3;
  return levels;
}

/* ---------------------------------------------------------------------
 * Formatações dos stories
 * --------------------------------------------------------------------- */

/** "1h12", "48 min", "0 min". */
export function storyDuration(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}

/** Volume inteiro na unidade do usuário: "12.480". */
export function storyVolume(volumeKg: number, unit: WeightUnit): string {
  return formatNumber(toDisplayWeight(volumeKg, unit) ?? 0, 0);
}

/** Volume compacto: "12,4 t" (kg) · "27,5 mil lb" · abaixo de mil, o número inteiro. */
export function storyVolumeCompact(volumeKg: number, unit: WeightUnit): string {
  const value = toDisplayWeight(volumeKg, unit) ?? 0;
  if (value < 1000) return `${formatNumber(value, 0)} ${unit}`;
  return unit === "kg" ? `${formatNumber(value / 1000, 1)} t` : `${formatNumber(value / 1000, 1)} mil lb`;
}

/** Carga na unidade do usuário: "80 kg", "82,5 kg". */
export function storyLoad(weightKg: number, unit: WeightUnit): string {
  return `${formatNumber(toDisplayWeight(weightKg, unit) ?? 0)} ${unit}`;
}

/** "Treino A – Peito e Tríceps" → { routine: "Treino A", focus: "Peito e Tríceps" }; sem travessão, foco = nome. */
export function splitWorkoutName(name: string): { routine: string | null; focus: string } {
  const parts = name.split(/\s+[–-]\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return { routine: parts[0], focus: parts.slice(1).join(" – ") };
  return { routine: null, focus: name };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthName = (date: Date) => capitalize(format(date, "LLLL", { locale: ptBR }));
const monthShort = (date: Date) => format(date, "LLL", { locale: ptBR }).replace(".", "");
/** "12 set" */
const dayMonth = (date: Date) => format(date, "d MMM", { locale: ptBR }).replace(".", "");

/* ---------------------------------------------------------------------
 * Entrada e saída
 * --------------------------------------------------------------------- */

export interface StorySetInput {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  /** Hora em que a série foi concluída (descanso médio); null quando não se sabe. */
  completedAt: string | null;
}

/** Melhor marca do exercício em destaque por treino (get_exercise_history), do mais antigo ao atual. */
export interface StoryFeaturedPoint {
  performedOn: string;
  maxWeightKg: number;
  e1rmKg: number;
}

export interface StoryInput {
  summary: {
    name: string;
    performedOn: string;
    startedAt: string;
    durationSeconds: number;
    volumeKg: number;
    setCount: number;
    weightUnit: WeightUnit;
    exercises: ReadonlyArray<{ name: string; muscleGroup: string; sets: readonly StorySetInput[]; setCount: number; volumeKg: number }>;
    records: ReadonlyArray<{
      exerciseName: string;
      weightKg: number;
      reps: number | null;
      previousWeightKg: number | null;
      previousOn: string | null;
    }>;
  };
  /** Treinos concluídos até este (inclusive) e a data do primeiro. */
  history: { totalWorkouts: number; firstWorkoutOn: string | null };
  /** Exercício em destaque (recorde ou maior volume) nas últimas 8 semanas; null sem histórico. */
  featured: { exerciseName: string; points: readonly StoryFeaturedPoint[] } | null;
  /** Tempo efetivo somado dos treinos concluídos no mês do treino (segundos). */
  monthActiveSeconds: number;
  /** Projeto da rotina do treino (treinos concluídos e volume no projeto); null em treino livre. */
  project: { name: string; workouts: number; volumeKg: number; firstOn: string } | null;
  streak: { currentStreak: number; bestStreak: number };
  weeklyGoal: number | null;
  /** Dias treinados das últimas semanas até a semana do treino (get_training_days). */
  trainingDays: ReadonlyArray<{ performedOn: string; sessions: number; volumeKg: number }>;
  /** Séries concluídas (sem aquecimento) por grupo, nos treinos do mês do treino e do anterior. */
  monthSets: ReadonlyArray<{ performedOn: string; muscleGroup: string; sets: number }>;
}

export interface StoryExercise {
  name: string;
  setCount: number;
  /** Repetições mais comuns nas séries válidas (para "4 × 8"). */
  reps: number | null;
  /** "4 × 8" */
  scheme: string;
  /** "80 kg" · "Peso corporal" */
  load: string;
  /** "80 kg" · "corporal" (tabelas estreitas) */
  loadShort: string;
  /** "2.560" · "—" (sem carga) */
  volume: string;
  volumeKg: number;
  isRecord: boolean;
  /** Carga sem unidade ("80"); null = peso corporal. */
  loadValue: string | null;
}

/** Dia da semana do treino (dom–sáb). */
export interface StoryWeekDay {
  /** "D" */
  initial: string;
  /** "Dom" */
  short: string;
  trained: boolean;
  /** "12,5k" · "–" (sem treino) */
  volume: string;
  /** Altura da barra (0–100). */
  pct: number;
  /** É o dia do treino. */
  today: boolean;
  /** Depois do dia do treino. */
  future: boolean;
}

export interface StoryRecord {
  exerciseName: string;
  /** "80" (sem unidade) */
  load: string;
  /** "+5 kg" */
  delta: string;
  /** "+6,7%" ou null (sem marca anterior) */
  deltaPct: string | null;
  /** Repetições da série do recorde. */
  reps: number | null;
  /** Dia da marca anterior: "12 set" (null sem marca). */
  previousDate: string | null;
  /** Marca anterior: "75" e rótulo "SETEMBRO" (ou "ANTES"), barra proporcional (0–100). */
  previousLoad: string | null;
  previousLabel: string;
  previousPct: number;
  /** "4 × 8" */
  scheme: string;
}

export interface StoryWeek {
  label: string;
  volume: number;
  /** Altura da barra (0–100). */
  pct: number;
  current: boolean;
}

export interface StoryMonth {
  name: string;
  workouts: number;
  /** "148 t" */
  volume: string;
  /** "168.420" (inteiro, unidade do usuário) */
  volumeFull: string;
  groups: number;
  muscles: StoryMuscleLevels;
}

/** Dia do calendário do mês (semana de domingo a sábado). */
export interface StoryCalendarDay {
  day: number;
  trained: boolean;
  /** Depois do dia do treino (aparece apagado). */
  future: boolean;
}

/** Objeto equivalente ao volume do treino (Comparações de peso). */
export interface StoryComparison extends WeightComparison {
  /** Pose do Guf Rat pelo volume levantado. */
  effort: LiftEffort;
}

export interface StoryData {
  unit: WeightUnit;
  /** Data local do treino ("2026-10-12"), para o nome do arquivo. */
  performedOn: string;
  title: string;
  /** "Treino A" (null em treino livre/sem travessão) */
  routine: string | null;
  /** "Peito e Tríceps" */
  focus: string;
  /** "Seg, 12 out" */
  date: string;
  /** "Seg, 12 out 2026 · 18:40" */
  dateTime: string;
  duration: string;
  /** Duração em partes para números grandes: [{ value: "1", unit: "h" }, { value: "12", unit: "min" }]. */
  durationParts: Array<{ value: string; unit: string }>;
  volume: string;
  volumeCompact: string;
  sets: number;
  reps: number;
  exerciseCount: number;
  muscles: StoryMuscleLevels;
  /** Até 3 grupos com a intensidade da legenda. */
  muscleLegend: Array<{ label: string; level: 1 | 2 | 3 }>;
  exercises: StoryExercise[];
  /** Exercícios por volume (maior primeiro), barra proporcional ao maior. */
  volumeRanking: Array<{ name: string; volume: string; pct: number }>;
  records: StoryRecord[];
  streak: {
    current: number;
    best: number;
    /** Últimas 12 e 16 semanas (antiga → atual): true = teve treino. */
    last12: boolean[];
    last16: boolean[];
    /** Rótulos de mês sob as 16 semanas (4 grupos). */
    monthLabels: string[];
    /** Número da semana do treino no ano (semana dom–sáb): "Semana 42". */
    weekNumber: number;
    /** Dias das últimas 5 semanas (dom–sáb, antiga → atual; 35 itens). */
    days35: Array<{ trained: boolean; today: boolean; future: boolean }>;
  };
  week: {
    /** Treinos na semana do treino (dom–sáb). */
    count: number;
    goal: number | null;
    /** Progresso da meta (0–1). */
    goalProgress: number;
    /** Treinos que faltam para a meta (0 sem meta ou cumprida). */
    remaining: number;
    /** Volume da semana do treino e variação vs. a anterior. */
    volume: string;
    changePct: string | null;
    changeUp: boolean;
    bars: StoryWeek[];
    /** "4 – 10 out" (domingo a sábado). */
    range: string;
    /** Os 7 dias da semana do treino (domingo primeiro). */
    days: StoryWeekDay[];
    /** Grupos treinados na semana (níveis 1–3) e os 4 principais. */
    muscles: StoryMuscleLevels;
    muscleLegend: string[];
  };
  month: {
    previous: StoryMonth;
    current: StoryMonth;
    /** "Outubro 2026" */
    label: string;
    /** Tempo efetivo somado no mês: "14h20". */
    duration: string;
    /** Participação dos grupos no mês do treino (5 maiores; braços somados). */
    shares: Array<{ label: string; pct: number }>;
    /** Calendário do mês do treino: null = espaço antes do dia 1 (até o domingo). */
    calendar: Array<StoryCalendarDay | null>;
  };
  /** Comparação de peso do volume (null abaixo de 20 kg). */
  comparison: StoryComparison | null;
  /** Descanso médio entre séries do treino ("1:32"); null sem horários suficientes. */
  restAverage: string | null;
  /** Grupo com mais séries no treino. */
  topMuscle: { label: string; exercises: number; sets: number } | null;
  /** Exercício em destaque nas últimas 8 semanas (≥ 2 treinos). */
  featured: StoryFeatured | null;
  /** Treinos concluídos até este e desde quando ("março de 2026"). */
  milestone: { total: number; since: string | null };
  /** Projeto da rotina: treinos, volume ("612.400") e semanas desde o primeiro treino nele. */
  project: { name: string; workouts: number; volume: string; weeks: number } | null;
}

export interface StoryFeatured {
  exerciseName: string;
  /** Carga máxima por treino (unidade do usuário), antiga → atual. */
  loads: number[];
  /** "24" e "28" */
  loadFirst: string;
  loadNow: string;
  /** "+16,7%" (null se a primeira for 0) */
  loadChangePct: string | null;
  /** 1RM estimado por treino (unidade do usuário), antiga → atual. */
  oneRms: number[];
  oneRmFirst: string;
  oneRmNow: string;
  /** "+12,5 kg" */
  oneRmDelta: string;
}

/* ---------------------------------------------------------------------
 * Montagem
 * --------------------------------------------------------------------- */

const mostCommon = (values: readonly number[]): number | null => {
  const count = new Map<number, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = 0;
  for (const [v, c] of count) if (c > bestCount || (c === bestCount && best !== null && v > best)) [best, bestCount] = [v, c];
  return best;
};

function weekKey(date: Date): string {
  return toLocalISODate(startOfLocalWeek(date));
}

/** Número da semana no ano com a semana do app (dom–sáb). */
const weekNumberOf = (date: Date) => getWeek(date, { weekStartsOn: WEEK_STARTS_ON, firstWeekContainsDate: 1 });

/** Volume curto para barras pequenas: "12,5k", "820", "–". */
function shortVolume(value: number): string {
  if (value <= 0) return "–";
  return value >= 1000 ? `${formatNumber(value / 1000, 1)}k` : formatNumber(value, 0);
}

/** "1:32" (minutos:segundos). */
function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Intervalo acima disso não é descanso (troca de exercício, conversa, pausa). */
const MAX_REST_SECONDS = 10 * 60;

/** Descanso médio entre séries concluídas seguidas do mesmo exercício; null sem horários suficientes. */
export function storyRestAverage(exercises: ReadonlyArray<{ sets: readonly StorySetInput[] }>): string | null {
  const gaps: number[] = [];
  for (const e of exercises) {
    const times = e.sets
      .flatMap((s) => (s.completedAt ? [new Date(s.completedAt).getTime()] : []))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      const gap = ((times[i] ?? 0) - (times[i - 1] ?? 0)) / 1000;
      if (gap > 0 && gap <= MAX_REST_SECONDS) gaps.push(gap);
    }
  }
  return gaps.length ? clock(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
}

/** Exercício em destaque: cargas e 1RM por treino, com as variações prontas (≥ 2 treinos). */
export function storyFeatured(featured: StoryInput["featured"], unit: WeightUnit): StoryFeatured | null {
  const points = featured?.points.filter((p) => p.maxWeightKg > 0) ?? [];
  if (!featured || points.length < 2) return null;
  const show = (kg: number) => toDisplayWeight(kg, unit) ?? 0;
  const loads = points.map((p) => show(p.maxWeightKg));
  const oneRms = points.map((p) => Math.round(show(p.e1rmKg) * 10) / 10);
  const loadFirst = loads[0] ?? 0;
  const loadNow = loads[loads.length - 1] ?? 0;
  const oneRmFirst = oneRms[0] ?? 0;
  const oneRmNow = oneRms[oneRms.length - 1] ?? 0;
  return {
    exerciseName: featured.exerciseName,
    loads,
    loadFirst: formatNumber(loadFirst),
    loadNow: formatNumber(loadNow),
    loadChangePct: loadFirst > 0 ? `${formatSigned(((loadNow - loadFirst) / loadFirst) * 100)}%` : null,
    oneRms,
    oneRmFirst: formatNumber(oneRmFirst),
    oneRmNow: formatNumber(oneRmNow),
    oneRmDelta: `${formatSigned(oneRmNow - oneRmFirst)} ${unit}`,
  };
}

/** Monta os dados dos stories a partir do resumo e do contexto do usuário. */
export function buildStoryData(input: StoryInput): StoryData {
  const { summary, streak, weeklyGoal, trainingDays, monthSets } = input;
  const unit = summary.weightUnit;
  const day = fromLocalISODate(summary.performedOn);
  const { routine, focus } = splitWorkoutName(summary.name);
  const recordNames = new Set(summary.records.map((r) => r.exerciseName));

  const exercises: StoryExercise[] = summary.exercises.map((e) => {
    const working = e.sets.filter((s) => s.setType !== "warmup");
    const reps = mostCommon(working.flatMap((s) => (s.reps ? [s.reps] : [])));
    const maxKg = Math.max(0, ...working.map((s) => s.weightKg ?? 0));
    return {
      name: e.name,
      setCount: e.setCount,
      reps,
      scheme: reps ? `${e.setCount} ${TIMES_SIGN} ${reps}` : `${e.setCount} séries`,
      load: maxKg > 0 ? storyLoad(maxKg, unit) : "Peso corporal",
      loadShort: maxKg > 0 ? storyLoad(maxKg, unit) : "corporal",
      loadValue: maxKg > 0 ? formatNumber(toDisplayWeight(maxKg, unit) ?? 0) : null,
      volume: e.volumeKg > 0 ? storyVolume(e.volumeKg, unit) : "—",
      volumeKg: e.volumeKg,
      isRecord: recordNames.has(e.name),
    };
  });

  const ranked = exercises.filter((e) => e.volumeKg > 0).sort((a, b) => b.volumeKg - a.volumeKg);
  const topVolume = ranked[0]?.volumeKg ?? 1;

  const setsByGroup = summary.exercises.map((e) => ({ muscleGroup: e.muscleGroup, sets: e.setCount }));
  const muscles = storyMuscleLevels(setsByGroup);
  const muscleLegend = (Object.entries(muscles) as Array<[StoryMuscle, 1 | 2 | 3]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, level]) => ({ label: STORY_MUSCLE_LABEL[key], level }));

  // Grupo com mais séries no treino (Músculo do dia).
  const groupTotals = new Map<StoryMuscle, { exercises: number; sets: number }>();
  for (const e of summary.exercises) {
    const key = MUSCLE_TO_STORY[e.muscleGroup];
    if (!key || e.setCount <= 0) continue;
    const g = groupTotals.get(key) ?? { exercises: 0, sets: 0 };
    groupTotals.set(key, { exercises: g.exercises + 1, sets: g.sets + e.setCount });
  }
  const top = [...groupTotals.entries()].sort((a, b) => b[1].sets - a[1].sets)[0];

  const records: StoryRecord[] = summary.records.map((r) => {
    const ex = exercises.find((e) => e.name === r.exerciseName);
    const prev = r.previousWeightKg;
    const prevDate = r.previousOn ? fromLocalISODate(r.previousOn) : null;
    const sameMonth = prevDate && prevDate.getMonth() === day.getMonth() && prevDate.getFullYear() === day.getFullYear();
    const deltaDisplay = prev !== null ? (toDisplayWeight(r.weightKg, unit) ?? 0) - (toDisplayWeight(prev, unit) ?? 0) : null;
    return {
      exerciseName: r.exerciseName,
      load: formatNumber(toDisplayWeight(r.weightKg, unit) ?? 0),
      delta: deltaDisplay !== null ? `${formatSigned(deltaDisplay)} ${unit}` : "Novo",
      deltaPct: prev ? `${formatSigned(((r.weightKg - prev) / prev) * 100)}%` : null,
      reps: r.reps,
      previousDate: prevDate ? dayMonth(prevDate) : null,
      previousLoad: prev !== null ? formatNumber(toDisplayWeight(prev, unit) ?? 0) : null,
      previousLabel: prevDate && !sameMonth ? monthName(prevDate).toUpperCase() : "ANTES",
      previousPct: prev ? Math.round((prev / r.weightKg) * 10000) / 100 : 0,
      scheme: ex?.scheme ?? "",
    };
  });

  // Semanas (dom–sáb): volume e se teve treino, até a semana do treino.
  const byWeek = new Map<string, { sessions: number; volumeKg: number }>();
  for (const d of trainingDays) {
    if (d.performedOn > summary.performedOn && weekKey(fromLocalISODate(d.performedOn)) !== weekKey(day)) continue;
    const k = weekKey(fromLocalISODate(d.performedOn));
    const w = byWeek.get(k) ?? { sessions: 0, volumeKg: 0 };
    byWeek.set(k, { sessions: w.sessions + d.sessions, volumeKg: w.volumeKg + d.volumeKg });
  }
  const sunday = startOfLocalWeek(day);
  const weekStarts = (n: number) => Array.from({ length: n }, (_, i) => addLocalDays(sunday, -7 * (n - 1 - i)));
  const trained = (starts: Date[]) => starts.map((s) => (byWeek.get(toLocalISODate(s))?.sessions ?? 0) > 0);
  const last16Starts = weekStarts(16);
  // Um rótulo por grupo de 4 semanas, pelo mês da última semana do grupo (o último é o mês atual).
  const monthLabels = [3, 7, 11, 15].map((i) => monthShort(last16Starts[i] ?? day));

  const barStarts = weekStarts(8);
  const barVolumes = barStarts.map((s) => toDisplayWeight(byWeek.get(toLocalISODate(s))?.volumeKg ?? 0, unit) ?? 0);
  const maxBar = Math.max(1, ...barVolumes);
  const bars = barStarts.map((s, i) => ({
    label: `S${weekNumberOf(s)}`,
    volume: barVolumes[i] ?? 0,
    pct: Math.round(((barVolumes[i] ?? 0) / maxBar) * 100),
    current: i === barStarts.length - 1,
  }));
  const thisWeek = barVolumes[barVolumes.length - 1] ?? 0;
  const lastWeek = barVolumes[barVolumes.length - 2] ?? 0;
  const weekCount = byWeek.get(weekKey(day))?.sessions ?? 0;

  // Dias: volume por data (só até o dia do treino) para a semana e as últimas 5 semanas.
  const dayInfo = new Map<string, { sessions: number; volumeKg: number }>();
  for (const d of trainingDays) if (d.performedOn <= summary.performedOn) dayInfo.set(d.performedOn, d);
  const dayVolumes = Array.from({ length: 7 }, (_, i) => toDisplayWeight(dayInfo.get(toLocalISODate(addLocalDays(sunday, i)))?.volumeKg ?? 0, unit) ?? 0);
  const maxDay = Math.max(1, ...dayVolumes);
  const weekDays: StoryWeekDay[] = dayVolumes.map((volume, i) => {
    const date = addLocalDays(sunday, i);
    const iso = toLocalISODate(date);
    return {
      initial: WEEKDAY_INITIALS[i] ?? "",
      short: WEEKDAY_SHORT_NAMES[i] ?? "",
      trained: (dayInfo.get(iso)?.sessions ?? 0) > 0,
      volume: shortVolume(volume),
      pct: Math.round((volume / maxDay) * 100),
      today: iso === summary.performedOn,
      future: iso > summary.performedOn,
    };
  });
  const firstOf35 = addLocalDays(sunday, -28);
  const days35 = Array.from({ length: 35 }, (_, i) => {
    const iso = toLocalISODate(addLocalDays(firstOf35, i));
    return { trained: (dayInfo.get(iso)?.sessions ?? 0) > 0, today: iso === summary.performedOn, future: iso > summary.performedOn };
  });
  const saturday = addLocalDays(sunday, 6);
  const range =
    sunday.getMonth() === saturday.getMonth()
      ? `${sunday.getDate()} – ${dayMonth(saturday)}`
      : `${dayMonth(sunday)} – ${dayMonth(saturday)}`;
  const weekKeyOfDay = weekKey(day);
  const weekLevels = storyMuscleLevels(
    monthSets.filter((s) => s.performedOn <= summary.performedOn && weekKey(fromLocalISODate(s.performedOn)) === weekKeyOfDay),
  );
  const weekLegend = (Object.entries(weekLevels) as Array<[StoryMuscle, 1 | 2 | 3]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => STORY_MUSCLE_LABEL[key]);

  // Meses: o do treino e o anterior.
  const currentStart = startOfMonth(day);
  const previousStart = startOfMonth(subMonths(day, 1));
  const inMonth = (iso: string, start: Date) => {
    const d = fromLocalISODate(iso);
    return d.getFullYear() === start.getFullYear() && d.getMonth() === start.getMonth();
  };
  const monthOf = (start: Date): StoryMonth => {
    const days = trainingDays.filter((d) => inMonth(d.performedOn, start));
    const sets = monthSets.filter((s) => inMonth(s.performedOn, start));
    const levels = storyMuscleLevels(sets);
    const volumeKg = days.reduce((n, d) => n + d.volumeKg, 0);
    return {
      name: monthName(start),
      workouts: days.reduce((n, d) => n + d.sessions, 0),
      volume: storyVolumeCompact(volumeKg, unit),
      volumeFull: storyVolume(volumeKg, unit),
      groups: Object.keys(levels).length,
      muscles: levels,
    };
  };
  const shareTotals = new Map<string, number>();
  for (const s of monthSets.filter((x) => inMonth(x.performedOn, currentStart))) {
    const key = MUSCLE_TO_STORY[s.muscleGroup];
    if (!key) continue;
    const label = key === "biceps" || key === "triceps" || key === "antebraco" ? "Braços" : STORY_MUSCLE_LABEL[key];
    shareTotals.set(label, (shareTotals.get(label) ?? 0) + s.sets);
  }
  const shareSum = [...shareTotals.values()].reduce((a, b) => a + b, 0) || 1;
  const shares = [...shareTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, sets]) => ({ label, pct: Math.round((sets / shareSum) * 100) }));

  const comparison = pickWeightComparison(summary.volumeKg);
  const durationMinutes = Math.max(0, Math.round(summary.durationSeconds / 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationParts = hours
    ? [{ value: String(hours), unit: "h" }, ...(minutes ? [{ value: String(minutes), unit: "min" }] : [])]
    : [{ value: String(minutes), unit: "min" }];
  const project = input.project;
  const firstWorkout = input.history.firstWorkoutOn ? fromLocalISODate(input.history.firstWorkoutOn) : null;

  return {
    unit,
    performedOn: summary.performedOn,
    title: summary.name,
    routine,
    focus,
    date: formatShortDate(day),
    dateTime: `${formatShortDate(day)} ${format(day, "yyyy")} · ${format(new Date(summary.startedAt), "HH:mm")}`,
    duration: storyDuration(summary.durationSeconds),
    durationParts,
    volume: storyVolume(summary.volumeKg, unit),
    volumeCompact: storyVolumeCompact(summary.volumeKg, unit),
    sets: summary.setCount,
    reps: summary.exercises.reduce((n, e) => n + e.sets.filter((s) => s.setType !== "warmup").reduce((m, s) => m + (s.reps ?? 0), 0), 0),
    exerciseCount: summary.exercises.length,
    muscles,
    muscleLegend,
    exercises,
    volumeRanking: ranked
      .slice(0, 5)
      .map((e) => ({ name: e.name, volume: `${e.volume} ${unit}`, pct: Math.round((e.volumeKg / topVolume) * 100) })),
    records,
    streak: {
      current: streak.currentStreak,
      best: streak.bestStreak,
      last12: trained(weekStarts(12)),
      last16: trained(last16Starts),
      monthLabels,
      weekNumber: weekNumberOf(day),
      days35,
    },
    week: {
      count: weekCount,
      goal: weeklyGoal,
      goalProgress: weeklyGoal ? Math.min(1, weekCount / weeklyGoal) : 1,
      remaining: Math.max(0, (weeklyGoal ?? 0) - weekCount),
      volume: formatNumber(thisWeek, 0),
      changePct: lastWeek > 0 ? `${formatSigned(((thisWeek - lastWeek) / lastWeek) * 100, 0)}%` : null,
      changeUp: thisWeek >= lastWeek,
      bars,
      range,
      days: weekDays,
      muscles: weekLevels,
      muscleLegend: weekLegend,
    },
    month: {
      previous: monthOf(previousStart),
      current: monthOf(currentStart),
      label: `${monthName(currentStart)} ${format(currentStart, "yyyy")}`,
      duration: storyDuration(input.monthActiveSeconds),
      shares,
      calendar: storyMonthCalendar(day, trainingDays),
    },
    comparison: comparison ? { ...comparison, effort: liftEffort(summary.volumeKg) } : null,
    restAverage: storyRestAverage(summary.exercises),
    topMuscle: top ? { label: STORY_MUSCLE_LABEL[top[0]], ...top[1] } : null,
    featured: storyFeatured(input.featured, unit),
    milestone: {
      total: input.history.totalWorkouts,
      since: firstWorkout ? `${format(firstWorkout, "LLLL 'de' yyyy", { locale: ptBR })}` : null,
    },
    project: project
      ? {
          name: project.name,
          workouts: project.workouts,
          volume: storyVolume(project.volumeKg, unit),
          weeks: Math.max(1, Math.floor(differenceInCalendarDays(day, fromLocalISODate(project.firstOn)) / 7) + 1),
        }
      : null,
  };
}

/** Calendário do mês do treino (dom–sáb): dias treinados e os que ainda não chegaram. */
export function storyMonthCalendar(
  day: Date,
  trainingDays: ReadonlyArray<{ performedOn: string; sessions: number }>,
): Array<StoryCalendarDay | null> {
  const first = startOfMonth(day);
  const trained = new Set(trainingDays.filter((d) => d.sessions > 0).map((d) => d.performedOn));
  const blanks = weekdayPosition(first);
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<StoryCalendarDay | null> = Array.from({ length: blanks }, () => null);
  for (let n = 1; n <= total; n++) {
    const date = new Date(first.getFullYear(), first.getMonth(), n);
    cells.push({ day: n, trained: trained.has(toLocalISODate(date)), future: n > day.getDate() });
  }
  return cells;
}

/** Período que a API precisa buscar para montar os stories (16 semanas e 2 meses até o treino). */
export function storyContextRange(performedOn: string): { from: string; to: string } {
  const day = fromLocalISODate(performedOn);
  const sunday = startOfLocalWeek(day);
  const weeksFrom = addLocalDays(sunday, -7 * 15);
  const monthFrom = startOfMonth(subMonths(day, 1));
  const from = weeksFrom < monthFrom ? weeksFrom : monthFrom;
  const saturday = addLocalDays(sunday, 6);
  return { from: toLocalISODate(from), to: toLocalISODate(saturday) };
}

/** Início do período do exercício em destaque (8 semanas antes do treino). */
export function storyFeaturedFrom(performedOn: string): string {
  return toLocalISODate(addLocalDays(fromLocalISODate(performedOn), -7 * 8));
}

/** Nome do arquivo baixado: "guf-story-04-2026-10-12.png". */
export function storyFileName(modelId: string, performedOn: string): string {
  return `guf-story-${modelId}-${performedOn}.png`;
}
