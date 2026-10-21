/**
 * Medidas de uma série por tipo de exercício (puras, sem React).
 * Força: carga × repetições. Cardio (exercises.muscle_group = "cardio"): distância (km) e tempo.
 * As telas pedem tudo à definição do tipo (colunas, rótulos, formatação e edição) em vez de testar
 * "é cardio?" em cada lugar: um tipo novo é uma entrada nova em SET_METRICS.
 */
import { MINUS_SIGN, TIMES_SIGN, formatNumber } from "./format";
import { formatElapsed } from "./session";
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from "./units";

export type SetMetricKind = "strength" | "cardio";

/** Campos medidos de uma série (como no banco: carga em kg, tempo em segundos). */
export type SetField = "weightKg" | "reps" | "distanceKm" | "durationSeconds";

export interface SetValues {
  weightKg: number | null;
  reps: number | null;
  distanceKm: number | null;
  durationSeconds: number | null;
}

/** Série sem nenhum valor medido. */
export const EMPTY_SET_VALUES: SetValues = { weightKg: null, reps: null, distanceKm: null, durationSeconds: null };

/** Atalhos da folha de edição: somam ao valor (add) ou o substituem (set). Valores na unidade exibida. */
export type SetFieldShortcuts =
  | { mode: "add"; options: ReadonlyArray<{ delta: number; label: string }> }
  | { mode: "set"; values: readonly number[] };

/** Como um campo é exibido e editado. Valores de exibição já na unidade do usuário. */
export interface SetFieldDefinition {
  key: SetField;
  /** Cabeçalho da coluna ("kg", "Reps", "km", "Tempo"). */
  header: (unit: WeightUnit) => string;
  /** Rótulo do campo na folha de edição ("Carga (kg)", "Distância (km)"). */
  label: (unit: WeightUnit) => string;
  /** Nome acessível da célula ("Carga", "Distância"). */
  cellLabel: string;
  /** Valor da célula ("82,5", "5,2", "32:10" ou "—"). */
  formatCell: (stored: number | null, unit: WeightUnit) => string;
  /** Banco → número editado (kg → lb; segundos → minutos). */
  toDisplay: (stored: number | null, unit: WeightUnit) => number | null;
  /** Número editado → banco. */
  fromDisplay: (display: number, unit: WeightUnit) => number;
  /** Passo dos botões − e + (na unidade exibida). */
  step: (unit: WeightUnit) => number;
  shortcuts: SetFieldShortcuts;
  /** Unidade mostrada no teclado numérico. */
  keypadUnit: (unit: WeightUnit) => string;
  decreaseLabel: string;
  increaseLabel: string;
  /** Nome acessível do número tocável que abre o teclado. */
  typeLabel: string;
}

export interface SetMetricDefinition {
  kind: SetMetricKind;
  /** As duas colunas da linha da série, na ordem. */
  fields: readonly [SetFieldDefinition, SetFieldDefinition];
  /** Valores de uma série nova sem histórico (força: 10 repetições). */
  defaults: Partial<SetValues>;
  /** Curto, para "Anterior" e "Próx.": "80 × 10" · "5,2 km · 32:10" · "—". */
  formatCompact: (values: SetValues, unit: WeightUnit) => string;
  /** Com unidades, para o resumo e avisos: "80 kg × 10" · "5,2 km · 32:10". */
  formatFull: (values: SetValues, unit: WeightUnit) => string;
  /** Para leitores de tela: "80 kg, 10 repetições" · "5,2 km, 32 min 10 s". */
  describe: (values: SetValues, unit: WeightUnit) => string;
  /** Totais do exercício depois das séries: "1.240 kg" · "10,4 km · 1:04:20" (vazio = nada a mostrar). */
  formatTotals: (sets: readonly SetValues[], unit: WeightUnit) => string;
}

const DASH = "—";
const SECONDS_PER_MINUTE = 60;

const cellNumber = (value: number | null, digits = 1) => (value === null ? DASH : formatNumber(value, digits));
const roundTo = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
const sumOf = (values: ReadonlyArray<number | null>) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

/** "32 min 10 s" · "1 h 4 min" (leitores de tela). */
function describeDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return [hours && `${hours} h`, minutes && `${minutes} min`, seconds && `${seconds} s`].filter(Boolean).join(" ") || "0 s";
}

const WEIGHT_FIELD: SetFieldDefinition = {
  key: "weightKg",
  header: (unit) => unit,
  label: (unit) => `Carga (${unit})`,
  cellLabel: "Carga",
  formatCell: (kg, unit) => cellNumber(toDisplayWeight(kg, unit)),
  toDisplay: (kg, unit) => toDisplayWeight(kg, unit),
  fromDisplay: (value, unit) => fromDisplayWeight(value, unit) ?? 0,
  step: (unit) => (unit === "lb" ? 5 : 2),
  shortcuts: {
    mode: "add",
    options: [
      { delta: -1, label: `${MINUS_SIGN}1` },
      { delta: 1, label: "+1" },
      { delta: 5, label: "+5" },
      { delta: 10, label: "+10" },
    ],
  },
  keypadUnit: (unit) => unit,
  decreaseLabel: "Diminuir carga",
  increaseLabel: "Aumentar carga",
  typeLabel: "Digitar carga",
};

const REPS_FIELD: SetFieldDefinition = {
  key: "reps",
  header: () => "Reps",
  label: () => "Repetições",
  cellLabel: "Repetições",
  formatCell: (reps) => cellNumber(reps),
  toDisplay: (reps) => reps,
  fromDisplay: (value) => Math.round(value),
  step: () => 1,
  shortcuts: { mode: "set", values: [6, 8, 10, 12, 15] },
  keypadUnit: () => "reps",
  decreaseLabel: "Menos uma repetição",
  increaseLabel: "Mais uma repetição",
  typeLabel: "Digitar repetições",
};

const DISTANCE_FIELD: SetFieldDefinition = {
  key: "distanceKm",
  header: () => "km",
  label: () => "Distância (km)",
  cellLabel: "Distância",
  formatCell: (km) => cellNumber(km, 2),
  toDisplay: (km) => km,
  fromDisplay: (value) => roundTo(value, 2),
  step: () => 0.5,
  shortcuts: {
    mode: "add",
    options: [
      { delta: -0.5, label: `${MINUS_SIGN}0,5` },
      { delta: 0.5, label: "+0,5" },
      { delta: 1, label: "+1" },
      { delta: 5, label: "+5" },
    ],
  },
  keypadUnit: () => "km",
  decreaseLabel: "Diminuir distância",
  increaseLabel: "Aumentar distância",
  typeLabel: "Digitar distância",
};

const DURATION_FIELD: SetFieldDefinition = {
  key: "durationSeconds",
  header: () => "Tempo",
  label: () => "Tempo (min)",
  cellLabel: "Tempo",
  formatCell: (seconds) => (seconds === null ? DASH : formatElapsed(seconds)),
  // Editado em minutos (1 casa: 32,5 min = 32:30); guardado em segundos.
  toDisplay: (seconds) => (seconds === null ? null : roundTo(seconds / SECONDS_PER_MINUTE, 1)),
  fromDisplay: (minutes) => Math.round(minutes * SECONDS_PER_MINUTE),
  step: () => 1,
  shortcuts: {
    mode: "add",
    options: [
      { delta: -1, label: `${MINUS_SIGN}1` },
      { delta: 1, label: "+1" },
      { delta: 5, label: "+5" },
      { delta: 10, label: "+10" },
    ],
  },
  keypadUnit: () => "min",
  decreaseLabel: "Menos um minuto",
  increaseLabel: "Mais um minuto",
  typeLabel: "Digitar tempo em minutos",
};

const STRENGTH: SetMetricDefinition = {
  kind: "strength",
  fields: [WEIGHT_FIELD, REPS_FIELD],
  defaults: { reps: 10 },
  formatCompact: ({ weightKg, reps }, unit) => {
    if (reps === null) return DASH;
    const load = toDisplayWeight(weightKg, unit);
    return load === null ? `${reps} reps` : `${formatNumber(load)} ${TIMES_SIGN} ${reps}`;
  },
  formatFull: ({ weightKg, reps }, unit) => `${formatNumber(toDisplayWeight(weightKg, unit) ?? 0)} ${unit} ${TIMES_SIGN} ${reps ?? 0}`,
  describe: ({ weightKg, reps }, unit) => `${formatNumber(toDisplayWeight(weightKg, unit) ?? 0)} ${unit}, ${reps ?? 0} repetições`,
  formatTotals: (sets, unit) => {
    const volume = sumOf(sets.map((s) => (s.weightKg ?? 0) * (s.reps ?? 0)));
    return `${formatNumber(toDisplayWeight(volume, unit) ?? 0, 0)} ${unit}`;
  },
};

/** Partes preenchidas de distância e tempo ("5,2 km", "32:10"). */
function cardioParts({ distanceKm, durationSeconds }: Pick<SetValues, "distanceKm" | "durationSeconds">): string[] {
  return [distanceKm !== null && `${formatNumber(distanceKm, 2)} km`, durationSeconds !== null && formatElapsed(durationSeconds)].filter(
    (part): part is string => Boolean(part),
  );
}

const CARDIO: SetMetricDefinition = {
  kind: "cardio",
  fields: [DISTANCE_FIELD, DURATION_FIELD],
  defaults: {},
  formatCompact: (values) => cardioParts(values).join(" · ") || DASH,
  formatFull: (values) => cardioParts(values).join(" · ") || DASH,
  describe: ({ distanceKm, durationSeconds }) =>
    [distanceKm !== null && `${formatNumber(distanceKm, 2)} km`, durationSeconds !== null && describeDuration(durationSeconds)]
      .filter(Boolean)
      .join(", ") || "sem distância nem tempo",
  formatTotals: (sets) => {
    const distance = sets.some((s) => s.distanceKm !== null) ? sumOf(sets.map((s) => s.distanceKm)) : null;
    const duration = sets.some((s) => s.durationSeconds !== null) ? sumOf(sets.map((s) => s.durationSeconds)) : null;
    return cardioParts({ distanceKm: distance, durationSeconds: duration }).join(" · ");
  },
};

export const SET_METRICS: Record<SetMetricKind, SetMetricDefinition> = { strength: STRENGTH, cardio: CARDIO };

/** Tipo de medida de um exercício pelo grupo muscular (código de exercises.muscle_group). */
export function setMetricKind(muscleGroup: string): SetMetricKind {
  return muscleGroup === "cardio" ? "cardio" : "strength";
}

/** Definição das medidas de um exercício pelo grupo muscular. */
export function setMetricFor(muscleGroup: string): SetMetricDefinition {
  return SET_METRICS[setMetricKind(muscleGroup)];
}

/** Valores medidos de uma série (descarta os outros campos do objeto). */
export function pickSetValues(set: Partial<SetValues> | null | undefined): SetValues {
  return {
    weightKg: set?.weightKg ?? null,
    reps: set?.reps ?? null,
    distanceKm: set?.distanceKm ?? null,
    durationSeconds: set?.durationSeconds ?? null,
  };
}

export interface NextSetCandidate {
  exerciseName: string;
  /** Código de exercises.muscle_group (define as medidas: força ou cardio). */
  muscleGroup: string;
  sets: ReadonlyArray<SetValues & { isCompleted: boolean }>;
}

/**
 * Próxima série pendente depois de (exerciseIndex, setIndex), para a barra de descanso:
 * "Próx.: Puxada frontal 65 × 8" · "Próx.: Esteira 2 km · 12:00" · "Última série do treino".
 */
export function nextSetLabel(exercises: readonly NextSetCandidate[], exerciseIndex: number, setIndex: number, unit: WeightUnit): string {
  for (let e = exerciseIndex; e < exercises.length; e++) {
    const ex = exercises[e];
    if (!ex) continue;
    const start = e === exerciseIndex ? setIndex + 1 : 0;
    const next = ex.sets.slice(start).find((set) => !set.isCompleted);
    if (!next) continue;
    const values = setMetricFor(ex.muscleGroup).formatCompact(next, unit);
    return `Próx.: ${ex.exerciseName}${values === DASH ? "" : ` ${values}`}`;
  }
  return "Última série do treino";
}
