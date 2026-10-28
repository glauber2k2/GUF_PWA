import { CARDIO_RATES, cardioActivityFor, formatDistance, type CardioActivityKey, type CardioRateKind } from "./cardio";
import { formatCardioRecord, type CardioRecord, type CardioRecordDisplay, type CardioRecordKind } from "./cardio-records";
import { formatElapsed } from "./session";
import type { SetValues } from "./set-metrics";
import type { SetType } from "./training";

/*
 * Cardio nas imagens de compartilhamento: tempo, distância e ritmo (esteira, remo) ou velocidade (bike,
 * elíptico, outros), com as mesmas regras do card de cardio do treino (cardio.ts). Puras, sem React.
 */

export interface StoryCardioSetInput extends Pick<SetValues, "distanceKm" | "durationSeconds"> {
  setType: SetType;
}

export interface StoryCardioInput {
  exercises: ReadonlyArray<{ name: string; sets: readonly StoryCardioSetInput[] }>;
  records: ReadonlyArray<{ exerciseName: string; cardio: CardioRecord }>;
}

/** Tempo, distância e desempenho prontos para a arte (sem distância: distância e desempenho nulos). */
export interface StoryCardioTotals {
  /** "32:10" · "1:02:40" */
  time: string;
  /** "5,2" (km, sem unidade) */
  distance: string | null;
  /** "6:11" (ritmo) · "12,4" (velocidade) */
  rate: string | null;
  /** "/km" · "km/h" */
  rateUnit: string;
  /** "RITMO MÉDIO" · "VELOCIDADE MÉDIA" */
  rateLabel: string;
}

export interface StoryCardioExercise extends StoryCardioTotals {
  name: string;
  activity: CardioActivityKey;
  /** "Corrida" · "Pedal" · "Aeróbico" */
  tag: string;
  isRecord: boolean;
}

export interface StoryCardio extends StoryCardioTotals {
  /** Aparelho do exercício com mais tempo (ícone e etiqueta da arte). */
  activity: CardioActivityKey;
  /** Como o aparelho principal mostra o desempenho: ritmo (min/km) ou velocidade (km/h). */
  rateKind: CardioRateKind;
  /** Velocidade média em km/h nos exercícios do mesmo tipo (velocímetro); null sem distância. */
  speedKmh: number | null;
  /** Tempo total em minutos inteiros ("42 MIN"). */
  minutes: number;
  tag: string;
  /** Nome do exercício principal (o de mais tempo). */
  title: string;
  exercises: StoryCardioExercise[];
  /** Primeiro recorde de cardio do treino, com o exercício. */
  record: (CardioRecordDisplay & { exerciseName: string; kind: CardioRecordKind }) | null;
}

const RATE_LABELS: Record<CardioRateKind, string> = {
  pace: "RITMO MÉDIO",
  speed: "VELOCIDADE MÉDIA",
};

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/** Velocidade média (km/h) das séries com distância e tempo; null sem nenhuma. */
function averageSpeedKmh(sets: readonly StoryCardioSetInput[]): number | null {
  const withDistance = sets.filter((s) => s.setType !== "warmup" && s.distanceKm && s.durationSeconds);
  const km = withDistance.reduce((n, s) => n + (s.distanceKm ?? 0), 0);
  const seconds = withDistance.reduce((n, s) => n + (s.durationSeconds ?? 0), 0);
  return km > 0 && seconds > 0 ? km / (seconds / SECONDS_PER_HOUR) : null;
}

/** Soma o tempo de todas as séries e calcula o desempenho só com as séries que têm distância. */
function cardioTotalsOf(sets: readonly StoryCardioSetInput[], rate: CardioRateKind): { seconds: number; totals: StoryCardioTotals } {
  const working = sets.filter((s) => s.setType !== "warmup");
  const seconds = working.reduce((n, s) => n + (s.durationSeconds ?? 0), 0);
  const withDistance = working.filter((s) => s.distanceKm && s.durationSeconds);
  const km = withDistance.reduce((n, s) => n + (s.distanceKm ?? 0), 0);
  const distanceSeconds = withDistance.reduce((n, s) => n + (s.durationSeconds ?? 0), 0);
  return {
    seconds,
    totals: {
      time: formatElapsed(seconds),
      distance: km > 0 ? formatDistance(km) : null,
      rate: km > 0 ? CARDIO_RATES[rate].format(distanceSeconds, km) : null,
      rateUnit: CARDIO_RATES[rate].totalSuffix.trim(),
      rateLabel: RATE_LABELS[rate],
    },
  };
}

/**
 * Cardio do treino para os stories; null sem exercício de cardio com tempo.
 * @returns totais do treino (o desempenho segue o aparelho do exercício principal), exercícios e recorde
 */
export function buildStoryCardio(input: StoryCardioInput): StoryCardio | null {
  const recordNames = new Set(input.records.map((r) => r.exerciseName));
  const exercises = input.exercises
    .map((e) => {
      const activity = cardioActivityFor(e.name);
      const { seconds, totals } = cardioTotalsOf(e.sets, activity.rate);
      return { seconds, exercise: { name: e.name, activity: activity.key, tag: activity.tag, isRecord: recordNames.has(e.name), ...totals } };
    })
    .filter((e) => e.seconds > 0);
  const main = [...exercises].sort((a, b) => b.seconds - a.seconds)[0];
  if (!main) return null;

  const mainActivity = cardioActivityFor(main.exercise.name);
  const { seconds, totals } = cardioTotalsOf(input.exercises.flatMap((e) => e.sets), mainActivity.rate);
  // Ritmo e velocidade só se comparam no mesmo tipo de aparelho: os km da bike não entram no ritmo da esteira.
  const sameRateSets = input.exercises.filter((e) => cardioActivityFor(e.name).rate === mainActivity.rate).flatMap((e) => e.sets);
  const record = input.records[0];
  return {
    ...totals,
    rate: cardioTotalsOf(sameRateSets, mainActivity.rate).totals.rate,
    activity: mainActivity.key,
    rateKind: mainActivity.rate,
    speedKmh: averageSpeedKmh(sameRateSets),
    minutes: Math.round(seconds / SECONDS_PER_MINUTE),
    tag: mainActivity.tag,
    title: main.exercise.name,
    exercises: exercises.map((e) => e.exercise),
    record: record ? { exerciseName: record.exerciseName, kind: record.cardio.kind, ...formatCardioRecord(record.cardio) } : null,
  };
}
