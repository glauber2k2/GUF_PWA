import type { AdminAnnouncement, AnnouncementDraft } from "@guf/api/admin";
import { AUDIENCE_ALL, fallbackPurpose, type Audience } from "@guf/core";
import { fromBrasiliaIso, toBrasiliaIso } from "@/shared/helpers/brasilia-time";

export type EditorStep = 1 | 2 | 3 | 4;
export type StartMode = "now" | "later";

export const EDITOR_STEPS: Array<{ step: EditorStep; label: string }> = [
  { step: 1, label: "Conteúdo" },
  { step: 2, label: "Público" },
  { step: 3, label: "Quando" },
  { step: 4, label: "Revisar" },
];

/** Tudo o que o editor guarda enquanto a pessoa preenche (datas nos campos de Brasília). */
export interface EditorState {
  draft: AnnouncementDraft;
  idsText: string;
  startMode: StartMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
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
};

/** Pessoas escolhidas em Pessoas (?para=) começam o comunicado novo só com a lista de ids. */
const IDS_AUDIENCE: Audience = { rules: [{ type: "ids" }] };

export function initialEditorState(existing?: AdminAnnouncement, presetTargetIds: string[] = []): EditorState {
  const usePreset = !existing && presetTargetIds.length > 0;
  const draft = existing?.draft ?? (usePreset ? { ...EMPTY_DRAFT, audience: IDS_AUDIENCE } : EMPTY_DRAFT);
  const start = fromBrasiliaIso(draft.startsAt);
  const end = fromBrasiliaIso(draft.endsAt);
  return {
    draft,
    idsText: (existing?.targetIds ?? presetTargetIds).join("\n"),
    startMode: draft.startsAt ? "later" : "now",
    startDate: start.date,
    startTime: start.time || "09:00",
    endDate: end.date,
    endTime: end.time || "23:59",
  };
}

/** Rascunho pronto para gravar: datas dos campos convertidas para ISO. */
export function draftFromState(state: EditorState): AnnouncementDraft {
  return {
    ...state.draft,
    startsAt: state.startMode === "later" ? toBrasiliaIso(state.startDate, state.startTime) : null,
    endsAt: toBrasiliaIso(state.endDate, state.endTime),
  };
}

/** Troca o público mantendo uma finalidade permitida (saúde nunca em produto). */
export function withAudience(draft: AnnouncementDraft, audience: Audience): AnnouncementDraft {
  return { ...draft, audience, purpose: fallbackPurpose(audience, draft.purpose) };
}
