import { differenceInMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatShortDate, fromLocalISODate } from "./dates";
import { muscleLevelsFromSets, type MuscleLevels } from "./muscle-levels";
import { setMetricFor } from "./set-metrics";
import type { WeightUnit } from "./units";

/**
 * Card do feed de treinos do perfil (Claude Design "Cards Feed de Treino" · 2a): textos e contas
 * puras. Os dados vêm de list_member_workout_feed (o servidor decide quem vê pontos e observação).
 */

/** Exercícios que cabem no card; o resto aparece como "+N exercícios · Ver mais". */
export const FEED_VISIBLE_EXERCISES = 4;

/** Um exercício do treino no card: séries concluídas e a melhor série (força: maior 1RM; cardio: maior distância). */
export interface WorkoutFeedExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  bestWeightKg: number | null;
  bestReps: number | null;
  bestDistanceKm: number | null;
  bestDurationSeconds: number | null;
  /** A melhor série bateu o recorde do exercício (só força). */
  isRecord: boolean;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** "Lucas Martins · Ter, 27 out · 58 min" */
export function feedOwnerLine(ownerName: string, performedOn: string, durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${ownerName} · ${formatShortDate(fromLocalISODate(performedOn))} · ${minutes} min`;
}

/** "agora" · "há 25 min" · "há 2 h" · "há 3 dias" */
function timeAgoLabel(date: Date, now: Date): string {
  const minutes = Math.max(0, differenceInMinutes(now, date));
  if (minutes < 1) return "agora";
  if (minutes < MINUTES_PER_HOUR) return `há ${minutes} min`;
  if (minutes < MINUTES_PER_DAY) return `há ${Math.floor(minutes / MINUTES_PER_HOUR)} h`;
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** "27 out, 21:14" (hora local do aparelho). */
function dayTimeLabel(date: Date): string {
  return format(date, "d MMM, HH:mm", { locale: ptBR }).replace(".", "");
}

/** Rodapé do card: "Editado há 2 h · 27 out, 21:14" ou "Concluído em 27 out, 20:16". */
export function feedFooterLabel(item: { editedAt: string | null; finishedAt: string }, now: Date = new Date()): string {
  if (item.editedAt) {
    const edited = new Date(item.editedAt);
    return `Editado ${timeAgoLabel(edited, now)} · ${dayTimeLabel(edited)}`;
  }
  return `Concluído em ${dayTimeLabel(new Date(item.finishedAt))}`;
}

/** Melhor série do exercício como o tipo dele mede: "90 kg × 6" · "5,2 km · 32:10". */
export function feedBestSetLabel(exercise: WorkoutFeedExercise, unit: WeightUnit): string {
  return setMetricFor(exercise.muscleGroup).formatFull(
    { weightKg: exercise.bestWeightKg, reps: exercise.bestReps, distanceKm: exercise.bestDistanceKm, durationSeconds: exercise.bestDurationSeconds },
    unit,
  );
}

/** Músculos acesos no boneco do card, pelas séries de cada exercício. */
export function feedMuscleLevels(exercises: readonly WorkoutFeedExercise[]): MuscleLevels {
  return muscleLevelsFromSets(exercises.map((e) => ({ muscleGroup: e.muscleGroup, sets: e.sets })));
}

/** Observação vazia no seu treino. */
export const FEED_EMPTY_NOTE = "Nada escrito em observação";

/** Treino de outra pessoa: a observação nunca é compartilhada (só o dono vê). */
export const FEED_PRIVATE_NOTE = "Observações ficam só com quem treinou";

/**
 * Texto do quadro de observação, que aparece sempre (o card mantém o mesmo desenho): a observação,
 * ou um texto de apoio quando não há (seu treino) ou não pode ser vista (de outra pessoa).
 */
export function feedNoteText(note: string | null, isOwnWorkout: boolean): { text: string; isPlaceholder: boolean } {
  if (note) return { text: note, isPlaceholder: false };
  return { text: isOwnWorkout ? FEED_EMPTY_NOTE : FEED_PRIVATE_NOTE, isPlaceholder: true };
}
