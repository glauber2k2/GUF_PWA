import { CARDIO_RATES, cardioActivityFor, formatDistance, type CardioRateKind } from "./cardio";
import { formatNumber, formatSigned, MINUS_SIGN, TIMES_SIGN } from "./format";
import { formatElapsed, markRecordSets } from "./session";
import { setMetricKind, type SetValues } from "./set-metrics";
import type { SetType } from "./training";
import { toDisplayWeight, type WeightUnit } from "./units";

/**
 * Recordes de cardio (puros, sem React). O cardio não tem carga nem 1RM: o recorde é de
 * desempenho, medido em segundos por km e mostrado como o aparelho mede (`cardioActivityFor`):
 * ritmo (min/km) na esteira e no remo, velocidade (km/h) na bike, no elíptico e nos outros.
 * - **Ritmo/velocidade:** a série mais rápida, entre as de pelo menos `CARDIO_RECORD_MIN_DISTANCE_KM`
 *   (um tiro de 200 m não vira recorde de ritmo).
 * - **Distância:** a série mais longa.
 * Um recorde por exercício por treino (ritmo vale mais que distância), contra todos os treinos
 * concluídos antes; empate não é recorde e a primeira vez de cada medida também não (como na força).
 */

/** Distância mínima da série para valer recorde de ritmo/velocidade. */
export const CARDIO_RECORD_MIN_DISTANCE_KM = 1;

export type CardioRecordKind = "rate" | "distance";

/** Melhores marcas de um exercício de cardio; null = nenhuma série com aquela medida. */
export interface CardioBest {
  /** Menor tempo por km (séries com pelo menos o mínimo de distância). */
  secondsPerKm: number | null;
  /** Maior distância de uma série (km). */
  distanceKm: number | null;
}

/** Série que pode bater recorde de cardio. */
export interface CardioRecordCandidate extends Pick<SetValues, "distanceKm" | "durationSeconds"> {
  setType: SetType;
  isCompleted: boolean;
}

/** Série do treino que bateu o recorde e de que tipo. */
export interface CardioRecordMark {
  kind: CardioRecordKind;
  setIndex: number;
}

/** Recorde de cardio pronto para exibir: a série que bateu e a marca anterior. */
export interface CardioRecord {
  kind: CardioRecordKind;
  /** Como o aparelho mostra o desempenho (ritmo ou velocidade). */
  rate: CardioRateKind;
  distanceKm: number;
  durationSeconds: number;
  /** Marca batida: segundos por km (ritmo/velocidade) ou km (distância). */
  previousValue: number;
}

const SECONDS_PER_HOUR = 3600;

function countsForRecord(set: CardioRecordCandidate): boolean {
  return set.isCompleted && set.setType !== "warmup";
}

/** Segundos por km da série; null sem tempo, sem km ou abaixo da distância mínima do recorde. */
export function setSecondsPerKm(set: Pick<SetValues, "distanceKm" | "durationSeconds">): number | null {
  const { distanceKm, durationSeconds } = set;
  if (!distanceKm || !durationSeconds || distanceKm < CARDIO_RECORD_MIN_DISTANCE_KM) return null;
  return durationSeconds / distanceKm;
}

function lowest(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? Math.min(...present) : null;
}

function highest(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null && value > 0);
  return present.length ? Math.max(...present) : null;
}

/** Melhores marcas das séries de um treino (concluídas e sem aquecimento). */
export function cardioBestOf(sets: readonly CardioRecordCandidate[]): CardioBest {
  const counted = sets.filter(countsForRecord);
  return { secondsPerKm: lowest(counted.map(setSecondsPerKm)), distanceKm: highest(counted.map((s) => s.distanceKm)) };
}

/**
 * Melhores marcas de vários treinos (o recorde a bater).
 * @returns null sem nenhum treino anterior (primeira vez: sem recorde).
 */
export function mergeCardioBests(bests: readonly CardioBest[]): CardioBest | null {
  if (bests.length === 0) return null;
  return { secondsPerKm: lowest(bests.map((b) => b.secondsPerKm)), distanceKm: highest(bests.map((b) => b.distanceKm)) };
}

/** Índice da série com o melhor valor (a primeira em caso de empate) que passa de `previous`; -1 se nenhuma. */
function beatingIndex(values: readonly (number | null)[], previous: number, isBetter: (value: number, best: number) => boolean): number {
  let index = -1;
  let best = previous;
  values.forEach((value, i) => {
    if (value !== null && isBetter(value, best)) {
      best = value;
      index = i;
    }
  });
  return index;
}

/**
 * Série do treino que bate o recorde do exercício de cardio: ritmo primeiro, senão distância.
 * @param previous melhores marcas antes deste treino; null/undefined = primeira vez (sem recorde).
 * @returns null quando nada foi batido.
 */
export function markCardioRecord(sets: readonly CardioRecordCandidate[], previous: CardioBest | null | undefined): CardioRecordMark | null {
  if (!previous) return null;
  const counted = sets.map((s) => (countsForRecord(s) ? s : null));
  if (previous.secondsPerKm !== null) {
    const index = beatingIndex(counted.map((s) => (s ? setSecondsPerKm(s) : null)), previous.secondsPerKm, (value, best) => value < best);
    if (index >= 0) return { kind: "rate", setIndex: index };
  }
  if (previous.distanceKm !== null) {
    const index = beatingIndex(counted.map((s) => s?.distanceKm ?? null), previous.distanceKm, (value, best) => value > best);
    if (index >= 0) return { kind: "distance", setIndex: index };
  }
  return null;
}

/**
 * Recorde de cardio do treino, pronto para o resumo e as imagens.
 * @param rate forma de desempenho do aparelho (`cardioActivityFor(nome).rate`).
 * @returns null quando nada foi batido.
 */
export function buildCardioRecord(
  sets: readonly CardioRecordCandidate[],
  previous: CardioBest | null | undefined,
  rate: CardioRateKind,
): { record: CardioRecord; setIndex: number } | null {
  const mark = markCardioRecord(sets, previous);
  const set = mark ? sets[mark.setIndex] : undefined;
  const previousValue = mark?.kind === "rate" ? previous?.secondsPerKm : previous?.distanceKm;
  if (!mark || !set?.distanceKm || !set.durationSeconds || previousValue === null || previousValue === undefined) return null;
  return {
    record: { kind: mark.kind, rate, distanceKm: set.distanceKm, durationSeconds: set.durationSeconds, previousValue },
    setIndex: mark.setIndex,
  };
}

/* ---------------------------------------------------------------------
 * Exibição
 * --------------------------------------------------------------------- */

/** Recorde de cardio formatado (resumo, fim do treino, folha do dia e stories). */
export interface CardioRecordDisplay {
  /** "Melhor ritmo" · "Maior velocidade" · "Maior distância" */
  title: string;
  /** "5:12" · "12,4" · "10,5" */
  value: string;
  /** "/km" · "km/h" · "km" */
  unit: string;
  /** Unidade lida por extenso: "por km" · "km por hora" · "km" */
  spokenUnit: string;
  /** Marca anterior no mesmo formato e unidade: "5:30" */
  previous: string;
  /** Quanto melhorou: "−0:18 /km" · "+1,2 km/h" · "+2,5 km" */
  delta: string;
  /** Melhora em %: "+5,8%" (no ritmo, quanto ficou mais rápido) */
  deltaPct: string;
  /** Marca anterior em relação à de hoje (0–100), para barras de comparação. */
  previousPct: number;
  /** A série do recorde: "5,2 km em 27:03" */
  setLabel: string;
}

const RECORD_TITLES: Record<CardioRateKind | "distance", string> = {
  pace: "Melhor ritmo",
  speed: "Maior velocidade",
  distance: "Maior distância",
};

function formatPaceSeconds(secondsPerKm: number): string {
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

const toPercent = (ratio: number) => Math.round(ratio * 10000) / 100;

function rateDisplay(record: CardioRecord, currentSecondsPerKm: number): Omit<CardioRecordDisplay, "title" | "setLabel"> {
  const improvementPct = `${formatSigned((record.previousValue / currentSecondsPerKm - 1) * 100)}%`;
  const previousPct = toPercent(currentSecondsPerKm / record.previousValue);
  if (record.rate === "pace") {
    return {
      value: formatPaceSeconds(currentSecondsPerKm),
      unit: CARDIO_RATES.pace.totalSuffix.trim(),
      spokenUnit: "por km",
      previous: formatPaceSeconds(record.previousValue),
      delta: `${MINUS_SIGN}${formatPaceSeconds(record.previousValue - currentSecondsPerKm)} /km`,
      deltaPct: improvementPct,
      previousPct,
    };
  }
  const speed = SECONDS_PER_HOUR / currentSecondsPerKm;
  const previousSpeed = SECONDS_PER_HOUR / record.previousValue;
  return {
    value: formatNumber(speed, 1),
    unit: CARDIO_RATES.speed.totalSuffix.trim(),
    spokenUnit: "km por hora",
    previous: formatNumber(previousSpeed, 1),
    delta: `${formatSigned(speed - previousSpeed)} km/h`,
    deltaPct: improvementPct,
    previousPct,
  };
}

/** Textos do recorde de cardio: valor, unidade, marca anterior e melhora. */
export function formatCardioRecord(record: CardioRecord): CardioRecordDisplay {
  const setLabel = `${formatDistance(record.distanceKm)} km em ${formatElapsed(record.durationSeconds)}`;
  if (record.kind === "distance") {
    return {
      title: RECORD_TITLES.distance,
      value: formatDistance(record.distanceKm),
      unit: "km",
      spokenUnit: "km",
      previous: formatDistance(record.previousValue),
      delta: `${formatSigned(record.distanceKm - record.previousValue, 2)} km`,
      deltaPct: `${formatSigned((record.distanceKm / record.previousValue - 1) * 100)}%`,
      previousPct: toPercent(record.previousValue / record.distanceKm),
      setLabel,
    };
  }
  return { title: RECORD_TITLES[record.rate], ...rateDisplay(record, record.durationSeconds / record.distanceKm), setLabel };
}

/* ---------------------------------------------------------------------
 * Recorde de qualquer exercício (força ou cardio)
 * --------------------------------------------------------------------- */

/** O que o recorde mede: carga (1RM; a série com carga × repetições) ou desempenho no cardio. */
export type RecordValue = { metric: "load"; weightKg: number; reps: number | null } | { metric: "cardio"; cardio: CardioRecord };

/** "80 kg × 8" · "5:12 /km" · "12,4 km/h" · "10,5 km" */
export function formatRecordValue(record: RecordValue, unit: WeightUnit): string {
  if (record.metric === "cardio") {
    const display = formatCardioRecord(record.cardio);
    return `${display.value} ${display.unit}`;
  }
  const load = `${formatNumber(toDisplayWeight(record.weightKg, unit) ?? 0)} ${unit}`;
  return record.reps ? `${load} ${TIMES_SIGN} ${record.reps}` : load;
}

/** Para leitores de tela: "80 kg por 8 repetições" · "melhor ritmo, 5:12 por km, 5,2 km em 27:03". */
export function describeRecordValue(record: RecordValue, unit: WeightUnit): string {
  if (record.metric === "cardio") {
    const display = formatCardioRecord(record.cardio);
    return `${display.title.toLowerCase()}, ${display.value} ${display.spokenUnit}, ${display.setLabel}`;
  }
  const load = `${formatNumber(toDisplayWeight(record.weightKg, unit) ?? 0)} ${unit}`;
  return record.reps ? `${load} por ${record.reps} repetições` : load;
}

/** Exercício com as marcas a bater: 1RM na força, ritmo e distância no cardio. */
export interface RecordExercise {
  name: string;
  muscleGroup: string;
  best1RmKg: number | null;
  cardioBest: CardioBest | null;
}

/** Série de qualquer tipo que pode bater recorde (força ou cardio). */
export type ExerciseRecordCandidate = CardioRecordCandidate & Pick<SetValues, "weightKg" | "reps">;

/**
 * Marca a série que bate o recorde do exercício, pela regra do tipo de medida: 1RM na força
 * (`markRecordSets`), ritmo/velocidade ou distância no cardio (`markCardioRecord`).
 */
export function markExerciseRecordSets(exercise: RecordExercise, sets: readonly ExerciseRecordCandidate[]): boolean[] {
  if (setMetricKind(exercise.muscleGroup) !== "cardio") return markRecordSets(sets, exercise.best1RmKg);
  const index = markCardioRecord(sets, exercise.cardioBest)?.setIndex ?? -1;
  return sets.map((_, i) => i === index);
}

/**
 * Recorde batido pelo exercício no treino (a série e o que ela marcou).
 * @returns null quando nada foi batido (ou primeira vez).
 */
export function buildExerciseRecord(
  exercise: RecordExercise,
  sets: readonly ExerciseRecordCandidate[],
): { setIndex: number; record: RecordValue } | null {
  if (setMetricKind(exercise.muscleGroup) === "cardio") {
    const built = buildCardioRecord(sets, exercise.cardioBest, cardioActivityFor(exercise.name).rate);
    return built && { setIndex: built.setIndex, record: { metric: "cardio", cardio: built.record } };
  }
  const setIndex = markRecordSets(sets, exercise.best1RmKg).indexOf(true);
  const set = sets[setIndex];
  if (!set) return null;
  return { setIndex, record: { metric: "load", weightKg: set.weightKg ?? 0, reps: set.reps } };
}
