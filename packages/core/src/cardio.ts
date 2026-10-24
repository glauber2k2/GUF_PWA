import { formatNumber } from "./format";
import { formatElapsed } from "./session";
import { MAX_SET_DURATION_SECONDS, type SetValues } from "./set-metrics";

/**
 * Regras do card de cardio no treino (protótipo Claude Design "Treino Cardio"): aparelho, ritmo ou
 * velocidade, tempo digitado ("2530" = 25:30), distância e totais. Puras, sem React.
 */

/** Como o card mostra o desempenho de uma série: ritmo (min/km) ou velocidade (km/h). */
export type CardioRateKind = "pace" | "speed";

export interface CardioRateDefinition {
  kind: CardioRateKind;
  /** Cabeçalho da coluna ("Ritmo", "km/h"). */
  columnLabel: string;
  /** Unidade depois do valor no total (" /km", " km/h"). */
  totalSuffix: string;
  /** Valor da série; null sem distância ou sem tempo. */
  format: (durationSeconds: number, distanceKm: number) => string;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Estratégias de desempenho: uma forma nova = uma entrada aqui. */
export const CARDIO_RATES: Record<CardioRateKind, CardioRateDefinition> = {
  pace: {
    kind: "pace",
    columnLabel: "Ritmo",
    totalSuffix: " /km",
    format: (durationSeconds, distanceKm) => {
      const secondsPerKm = Math.round(durationSeconds / distanceKm);
      return `${Math.floor(secondsPerKm / SECONDS_PER_MINUTE)}:${String(secondsPerKm % SECONDS_PER_MINUTE).padStart(2, "0")}`;
    },
  },
  speed: {
    kind: "speed",
    columnLabel: "km/h",
    totalSuffix: " km/h",
    format: (durationSeconds, distanceKm) => formatNumber(distanceKm / (durationSeconds / SECONDS_PER_HOUR), 1),
  },
};

/** Aparelho de cardio: ícone (chave do app), etiqueta e forma de desempenho. */
export type CardioActivityKey = "treadmill" | "bike" | "rower" | "elliptical" | "generic";

export interface CardioActivity {
  key: CardioActivityKey;
  /** Etiqueta ao lado de "Cardio" ("Corrida", "Pedal"…). */
  tag: string;
  rate: CardioRateKind;
  /** Palavras do nome do exercício que identificam o aparelho (sem acento, minúsculas). */
  keywords: readonly string[];
}

/** Catálogo dos aparelhos, na ordem de busca. Aparelho novo = uma entrada aqui (e o ícone no app). */
export const CARDIO_ACTIVITIES: readonly CardioActivity[] = [
  { key: "treadmill", tag: "Corrida", rate: "pace", keywords: ["esteira", "corrida", "caminhada", "trote"] },
  { key: "bike", tag: "Pedal", rate: "speed", keywords: ["bike", "bicicleta", "spinning", "ciclismo", "pedal"] },
  { key: "rower", tag: "Remo", rate: "pace", keywords: ["remo"] },
  { key: "elliptical", tag: "Transport", rate: "speed", keywords: ["eliptico", "transport"] },
];

const GENERIC_ACTIVITY: CardioActivity = { key: "generic", tag: "Aeróbico", rate: "speed", keywords: [] };

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Aparelho pelo nome do exercício (o catálogo não tem campo próprio); sem palavra conhecida, genérico. */
export function cardioActivityFor(exerciseName: string): CardioActivity {
  const name = normalizeName(exerciseName);
  return CARDIO_ACTIVITIES.find((activity) => activity.keywords.some((word) => name.includes(word))) ?? GENERIC_ACTIVITY;
}

/** Distância aceita pelo banco (set_logs.distance_km: 0–1000, 2 casas). */
export const MAX_CARDIO_DISTANCE_KM = 1000;
const TIME_INPUT_MAX_DIGITS = 6;

/** Máscara do tempo digitado: "2530" → "25:30"; "13000" → "1:30:00". Só dígitos, até h:mm:ss. */
export function maskDurationInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, TIME_INPUT_MAX_DIGITS).replace(/^0+(?=\d{3})/, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}

/** Segundos do tempo mascarado; null se vazio, zero, segundos ≥ 60 ou acima de 24 h. */
export function parseDurationInput(text: string): number | null {
  if (!text) return null;
  const parts = text.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  const last = parts[parts.length - 1] ?? 0;
  if (parts.length > 1 && last >= SECONDS_PER_MINUTE) return null;
  const seconds = parts.reduce((total, part) => total * SECONDS_PER_MINUTE + part, 0);
  return seconds > 0 && seconds <= MAX_SET_DURATION_SECONDS ? seconds : null;
}

/** Só dígitos e uma vírgula/ponto (o que o campo de km aceita enquanto digita). */
export function sanitizeDistanceInput(raw: string): string {
  return raw.replace(/[^\d.,]/g, "").slice(0, 7);
}

/** km digitados ("9,4") → número com 2 casas; null se vazio, zero ou fora do limite. */
export function parseDistanceInput(text: string): number | null {
  const value = Number.parseFloat(text.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > MAX_CARDIO_DISTANCE_KM) return null;
  return Math.round(value * 100) / 100;
}

/** "9,4" · "10,25" (km, sem unidade). */
export function formatDistance(distanceKm: number): string {
  return distanceKm.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/** Ritmo ou velocidade da série; "—" sem distância ou sem tempo. */
export function formatCardioRate(rate: CardioRateKind, values: Pick<SetValues, "durationSeconds" | "distanceKm">): string {
  const { durationSeconds, distanceKm } = values;
  if (!durationSeconds || !distanceKm) return "—";
  return CARDIO_RATES[rate].format(durationSeconds, distanceKm);
}

export interface CardioTotals {
  /** "41:00" (soma do tempo). */
  time: string;
  /** " · 11,2 km · 5:12 /km" (só com alguma distância; o ritmo usa só as séries que têm km). */
  rest: string;
}

/** Total do card: tempo somado e, se houver km, distância e ritmo/velocidade médios. */
export function cardioTotals(sets: readonly Pick<SetValues, "durationSeconds" | "distanceKm">[], rate: CardioRateKind): CardioTotals {
  const totalSeconds = sets.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const withDistance = sets.filter((s) => s.distanceKm && s.durationSeconds);
  const totalKm = withDistance.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0);
  const distanceSeconds = withDistance.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const rest = totalKm
    ? ` · ${formatDistance(totalKm)} km · ${CARDIO_RATES[rate].format(distanceSeconds, totalKm)}${CARDIO_RATES[rate].totalSuffix}`
    : "";
  return { time: formatElapsed(totalSeconds), rest };
}

/** "1 série" · "3 séries". */
export function cardioSetCountLabel(count: number): string {
  return count === 1 ? "1 série" : `${count} séries`;
}
