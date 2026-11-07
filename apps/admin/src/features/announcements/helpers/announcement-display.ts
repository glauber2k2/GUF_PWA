import { AppWindow, Maximize, MessageSquare, PanelTop, type LucideIcon } from "lucide-react";
import type { AdminAnnouncementSummary } from "@guf/api/admin";
import {
  describeAudience,
  formatCount,
  recurrenceEveryLabel,
  type AnnouncementFormat,
  type AnnouncementRecurrence,
  type AudienceContext,
} from "@guf/core";
import { PANEL_TIME_ZONE } from "@/shared/helpers/brasilia-time";
import { withDevState } from "@/shared/helpers/dev-state-path";

export const FORMAT_ICONS: Record<AnnouncementFormat, LucideIcon> = {
  fullscreen: Maximize,
  modal: AppWindow,
  toast: MessageSquare,
  banner: PanelTop,
};

const DAY_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: PANEL_TIME_ZONE });
const DAY_TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PANEL_TIME_ZONE });
const OCCURRENCE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: PANEL_TIME_ZONE,
});

function shortDay(iso: string): string {
  return DAY_FORMAT.format(new Date(iso)).replace(".", "").replace(" de ", " ");
}

/** "27 nov, 09:00" */
export function formatDayTime(iso: string): string {
  return DAY_TIME_FORMAT.format(new Date(iso)).replace(".", "").replace(" de ", " ").replace(" às ", ", ");
}

/** "qua, 12 nov, 09:00" (uma vez de um comunicado recorrente). */
export function formatOccurrence(date: Date): string {
  return OCCURRENCE_FORMAT.format(date).replaceAll(".", "").replace(" de ", " ").replace(" às ", ", ");
}

/** "1 out – 31 out" · "Toda semana · desde 4 nov" · "Sem data". */
export function formatPeriod(startsAt: string | null, endsAt: string | null, recurrence: AnnouncementRecurrence | null = null): string {
  const repeat = recurrence ? `${recurrenceEveryLabel(recurrence.unit, recurrence.every)} · ` : "";
  if (!startsAt && !endsAt) return recurrence ? `${repeat}a partir da publicação` : "Sem data";
  if (!endsAt) return `${repeat}desde ${startsAt ? shortDay(startsAt) : "a publicação"}`;
  return `${repeat}${startsAt ? shortDay(startsAt) : "Ao publicar"} – ${shortDay(endsAt)}`;
}

/** Números da lista ("—" antes de publicar). */
export function statValue(summary: AdminAnnouncementSummary, value: number | null): string {
  return summary.state === "draft" || value === null ? "—" : formatCount(value);
}

export function audienceLabel(summary: Pick<AdminAnnouncementSummary, "audience" | "targetsCount">, planNames: AudienceContext["planNames"]): string {
  return describeAudience(summary.audience, { planNames, targetCount: summary.targetsCount });
}

export function editorPath(id?: string): string {
  return withDevState(id ? `/comunicados/editar?id=${id}` : "/comunicados/editar");
}

/** Comunicado novo já com o público "Pessoas específicas" preenchido com estas pessoas (?para=id,id). */
export function editorForPeoplePath(userIds: string[]): string {
  return withDevState(`/comunicados/editar?para=${userIds.join(",")}`);
}

export function resultPath(id: string): string {
  return withDevState(`/comunicados/resultado?id=${id}`);
}

export function listPath(tab?: string): string {
  return withDevState(tab ? `/comunicados?aba=${tab}` : "/comunicados");
}
