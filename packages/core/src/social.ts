import { differenceInCalendarDays, differenceInCalendarMonths, differenceInMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromLocalISODate } from "./dates";
import { plural } from "./format";

/** Regras do módulo de seguidores (puras, sem React). As permissões são do banco; aqui só formato e textos. */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;

/** Mesma regra do banco (social_profiles.handle): letras minúsculas, números, ponto e _; sem começar ou terminar com ponto ou _. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;

/** A busca só começa a partir deste número de caracteres (igual ao servidor). */
export const SOCIAL_SEARCH_MIN_LENGTH = 3;

export type SocialVisibility = "private" | "open";

/** Relação de quem vê com a outra pessoa, como o banco devolve. */
export type SocialRelationship = "self" | "following" | "requested" | "none";

export type FollowButtonState = "self" | "following" | "requested" | "follow_back" | "follow" | "request";

export const FOLLOW_BUTTON_LABELS: Record<Exclude<FollowButtonState, "self">, string> = {
  following: "Seguindo",
  requested: "Solicitado",
  follow_back: "Seguir de volta",
  follow: "Seguir",
  request: "Solicitar para seguir",
};

/** "@Gui.Silva " → "gui.silva" (mesma normalização do servidor). */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, "").trim().toLowerCase();
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

/** "gui.silva" → "@gui.silva" */
export function formatHandle(handle: string): string {
  return `@${handle}`;
}

/** Botão de seguir: perfil privado pede aprovação; quem já segue você vê "Seguir de volta". */
export function followButtonState(relationship: SocialRelationship, followsYou: boolean, visibility: SocialVisibility): FollowButtonState {
  if (relationship !== "none") return relationship;
  if (visibility === "private") return "request";
  return followsYou ? "follow_back" : "follow";
}

/** Caminho do perfil de uma pessoa (também é o link de convite; rota estática com query string). */
export function socialInvitePath(handle: string): string {
  return `/pessoa?u=${encodeURIComponent(handle)}`;
}

/** Há quanto tempo treina: "1 ano e 7 meses" · "3 meses" · "menos de 1 mês". */
export function trainingTenure(firstWorkoutOn: string, today: Date): string {
  const months = Math.max(0, differenceInCalendarMonths(today, fromLocalISODate(firstWorkoutOn)));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return rest === 0 ? "menos de 1 mês" : plural(rest, "mês", "meses");
  const yearsLabel = plural(years, "ano", "anos");
  return rest === 0 ? yearsLabel : `${yearsLabel} e ${plural(rest, "mês", "meses")}`;
}

/** "mar 2025" */
export function monthYearLabel(isoDate: string): string {
  return format(fromLocalISODate(isoDate), "MMM yyyy", { locale: ptBR }).replace(".", "");
}

/** Quem vê o quê, conforme a visibilidade do perfil e do histórico. */
export function socialPrivacySummary(visibility: SocialVisibility, historyHidden: boolean): string {
  if (visibility === "private") {
    return historyHidden
      ? "Seguidores aprovados veem evolução e sequência. O histórico fica só com você."
      : "Seguidores aprovados veem evolução, sequência e histórico.";
  }
  return historyHidden
    ? "Qualquer pessoa no guf vê evolução e sequência. O histórico fica só com você."
    : "Qualquer pessoa no guf vê evolução, sequência e histórico.";
}

/** Quantos @ aparecem no subtítulo da barra de solicitações antes do "e mais N". */
export const FOLLOW_REQUEST_PREVIEW_HANDLES = 2;

/** "1 solicitação para seguir" · "4 solicitações para seguir". */
export function followRequestsTitle(count: number): string {
  return `${plural(count, "solicitação", "solicitações")} para seguir`;
}

/** "@rafa.costa, @bia.treina e mais 2" (subtítulo da barra de solicitações). */
export function followRequestsPreview(handles: string[]): string {
  const shown = handles.slice(0, FOLLOW_REQUEST_PREVIEW_HANDLES).map(formatHandle).join(", ");
  const rest = handles.length - FOLLOW_REQUEST_PREVIEW_HANDLES;
  return rest > 0 ? `${shown} e mais ${rest}` : shown;
}

/**
 * Quando o pedido chegou: "agora" · "há 25 min" · "há 2 h" · "ontem" · "há 3 dias".
 * @param since ISO do pedido
 * @param now relógio atual
 */
export function requestedAgoLabel(since: string, now: Date): string {
  const date = new Date(since);
  const minutes = Math.max(0, differenceInMinutes(now, date));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const days = differenceInCalendarDays(now, date);
  if (days < 1) return `há ${Math.floor(minutes / 60)} h`;
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}
