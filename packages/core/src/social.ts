import { differenceInCalendarDays, differenceInCalendarMonths, differenceInMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromLocalISODate, toLocalISODate } from "./dates";
import { plural } from "./format";

/** Regras do módulo de seguidores (puras, sem React). As permissões são do banco; aqui só formato e textos. */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;

/** Mesma regra do banco (social_profiles.handle): letras minúsculas, números, ponto e _; sem começar ou terminar com ponto ou _. */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;

/** @ aleatório do cadastro ("guf." + 6 caracteres hexadecimais, gerado no handle_new_user). */
const GENERATED_HANDLE_PATTERN = /^guf\.[0-9a-f]{6}$/;

/**
 * Se o @ ainda é o que o cadastro gerou (a pessoa nunca escolheu um).
 * @returns false sem @ (perfil ainda não carregado)
 */
export function isGeneratedHandle(handle: string | null | undefined): boolean {
  return handle !== null && handle !== undefined && GENERATED_HANDLE_PATTERN.test(handle);
}

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

/** Quantas sugestões de @ o cadastro mostra. */
const HANDLE_SUGGESTIONS = 3;

/** Nome sem acento, em minúsculas, só letras e números, em palavras. */
function nameWords(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Sugestões de @ a partir do nome (cadastro em passos): "glauber.monteiro", "glaubermonteiro"…; sem nome,
 * variações do @ em uso. Só formatos válidos; a disponibilidade é conferida quando a pessoa escolhe.
 * @param name nome digitado
 * @param takenHandle @ que já está em uso (fica de fora e serve de base sem nome)
 */
export function suggestHandles(name: string, takenHandle: string | null = null): string[] {
  const words = nameWords(name);
  const options: string[] = [];
  if (words.length > 0) {
    const first = words[0]!;
    const last = words.length > 1 ? words[words.length - 1]! : "";
    if (last) options.push(`${first}.${last}`, `${first}${last}`, `${first}_${last[0]}`);
    options.push(`${first}.treina`, `${first}${((name.length * 7) % 90) + 10}`);
  } else if (takenHandle) {
    options.push(`${takenHandle}.fit`, `${takenHandle}.treina`, `${takenHandle}_${new Date().getFullYear() % 100}`);
  }
  return [...new Set(options)].filter((h) => isValidHandle(h) && h !== takenHandle).slice(0, HANDLE_SUGGESTIONS);
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

/** Histórico de OUTRA pessoa: em qualquer plano, só os treinos do mês atual (regra do banco, list_member_workouts). */
export const MEMBER_HISTORY_SCOPE_NOTE = "Você vê os treinos deste mês.";

/** 1º dia do mês de `today` ("yyyy-MM-dd"): de onde o histórico de outra pessoa aparece. */
export function memberHistoryFrom(today: Date): string {
  return toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1));
}
