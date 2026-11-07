import type { AdminAnnouncement, AnnouncementDraft } from "@guf/api/admin";
import {
  AUDIENCE_ALL,
  buildRecurrence,
  DEFAULT_RECURRENCE_WINDOW_HOURS,
  fallbackPurpose,
  recurrenceEndAfter,
  type AnnouncementRecurrence,
  type Audience,
  type RecurrenceUnit,
} from "@guf/core";
import { endOfDayBrasiliaIso, fromBrasiliaIso, toBrasiliaIso } from "@/shared/helpers/brasilia-time";

export type EditorStep = 1 | 2 | 3 | 4;
export type StartMode = "now" | "later";
/** "none" = não repete. */
export type RepeatMode = RecurrenceUnit | "none";
/** Como um comunicado recorrente termina. */
export type RepeatEndMode = "never" | "date" | "count";

export const EDITOR_STEPS: Array<{ step: EditorStep; label: string }> = [
  { step: 1, label: "Conteúdo" },
  { step: 2, label: "Público" },
  { step: 3, label: "Quando" },
  { step: 4, label: "Revisar" },
];

/** Quantas vezes um recorrente que termina "depois de N vezes" começa com. */
export const DEFAULT_REPEAT_COUNT = 4;
export const REPEAT_COUNT_MAX = 365;

/** Tudo o que o editor guarda enquanto a pessoa preenche (datas nos campos de Brasília). */
export interface EditorState {
  draft: AnnouncementDraft;
  idsText: string;
  startMode: StartMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  repeat: RepeatMode;
  repeatEvery: number;
  windowHours: number;
  repeatEnd: RepeatEndMode;
  repeatCount: number;
}

export const EMPTY_DRAFT: AnnouncementDraft = {
  title: "",
  body: "",
  format: "modal",
  tone: "news",
  ctaLabel: null,
  ctaPath: null,
  audience: AUDIENCE_ALL,
  purpose: "service",
  priority: 50,
  frequency: "until_dismissed",
  startsAt: null,
  endsAt: null,
  recurrence: null,
};

/** Pessoas escolhidas em Pessoas (?para=) começam o comunicado novo só com a lista de ids. */
const IDS_AUDIENCE: Audience = { rules: [{ type: "ids" }] };

export function initialEditorState(existing?: AdminAnnouncement, presetTargetIds: string[] = []): EditorState {
  const usePreset = !existing && presetTargetIds.length > 0;
  const draft = existing?.draft ?? (usePreset ? { ...EMPTY_DRAFT, audience: IDS_AUDIENCE } : EMPTY_DRAFT);
  const start = fromBrasiliaIso(draft.startsAt);
  const end = fromBrasiliaIso(draft.endsAt);
  const recurrence = draft.recurrence;
  return {
    draft,
    idsText: (existing?.targetIds ?? presetTargetIds).join("\n"),
    startMode: draft.startsAt ? "later" : "now",
    startDate: start.date,
    startTime: start.time || "09:00",
    endDate: end.date,
    endTime: end.time || "23:59",
    repeat: recurrence?.unit ?? "none",
    repeatEvery: recurrence?.every ?? 1,
    windowHours: recurrence?.windowHours ?? DEFAULT_RECURRENCE_WINDOW_HOURS,
    // Um rascunho salvo guarda só a data de fim: "depois de N vezes" volta como a data.
    repeatEnd: recurrence && !draft.endsAt ? "never" : "date",
    repeatCount: DEFAULT_REPEAT_COUNT,
  };
}

/** Regra de repetição dos campos (nula quando não repete). */
export function recurrenceFromState(state: EditorState): AnnouncementRecurrence | null {
  if (state.repeat === "none") return null;
  return buildRecurrence(state.repeat, state.repeatEvery, state.windowHours);
}

/** Começo da 1ª vez: o escolhido ou, "ao publicar", agora (é quando a 1ª vez vai começar). */
export function firstStart(state: EditorState): Date {
  const chosen = state.startMode === "later" ? toBrasiliaIso(state.startDate, state.startTime) : null;
  return chosen ? new Date(chosen) : new Date();
}

/** Fim da campanha conforme o modo: data e hora (sem repetição), fim do dia, depois de N vezes ou sem fim. */
function endsAtFromState(state: EditorState, recurrence: AnnouncementRecurrence | null): string | null {
  if (!recurrence) return toBrasiliaIso(state.endDate, state.endTime);
  if (state.repeatEnd === "never") return null;
  if (state.repeatEnd === "date") return endOfDayBrasiliaIso(state.endDate);
  return recurrenceEndAfter(firstStart(state), recurrence, state.repeatCount).toISOString();
}

/** Rascunho pronto para gravar: datas dos campos convertidas para ISO e a repetição montada. */
export function draftFromState(state: EditorState): AnnouncementDraft {
  const recurrence = recurrenceFromState(state);
  return {
    ...state.draft,
    startsAt: state.startMode === "later" ? toBrasiliaIso(state.startDate, state.startTime) : null,
    endsAt: endsAtFromState(state, recurrence),
    recurrence,
  };
}

/** Troca o público mantendo uma finalidade permitida (saúde nunca em produto). */
export function withAudience(draft: AnnouncementDraft, audience: Audience): AnnouncementDraft {
  return { ...draft, audience, purpose: fallbackPurpose(audience, draft.purpose) };
}
