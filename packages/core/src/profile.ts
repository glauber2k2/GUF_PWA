import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromLocalISODate, toLocalISODate } from "./dates";
import { plural } from "./format";

/** Regras e textos da tela Perfil (puras, sem React). */

/** "Treinando desde mar 2026 · 48 treinos"; sem treino concluído → "Nenhum treino concluído ainda". */
export function trainingSinceLabel(firstTrainedOn: string | null, sessions: number): string {
  if (!firstTrainedOn || sessions === 0) return "Nenhum treino concluído ainda";
  const since = format(fromLocalISODate(firstTrainedOn), "MMM yyyy", { locale: ptBR }).replace(".", "");
  return `Treinando desde ${since} · ${plural(sessions, "treino", "treinos")}`;
}

/** Inicial do avatar (nome ou e-mail; "G" se não houver nada). */
export function avatarInitial(name: string | null | undefined, email: string | null | undefined): string {
  return ((name ?? "").trim().charAt(0) || (email ?? "").trim().charAt(0) || "G").toUpperCase();
}

/** Nome do arquivo de "Exportar meus dados" (data local). */
export function exportFileName(date: Date): string {
  return `guf-meus-dados-${toLocalISODate(date)}.json`;
}

/** "84 KB" · "1,2 MB" · "512 B". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/** Palavra que libera a exclusão da conta (sem diferenciar maiúsculas e espaços nas pontas). */
export const DELETE_ACCOUNT_WORD = "EXCLUIR";

export function isDeleteConfirmation(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_ACCOUNT_WORD;
}

/** Documentos legais exibidos no Perfil, na ordem. */
export type LegalDocType = "terms" | "privacy" | "age_declaration" | "health_consent";

export const LEGAL_DOC_TITLES: Record<LegalDocType, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  age_declaration: "Declaração de idade",
  health_consent: "Consentimento de dados de saúde",
};

/** "Aceito em 12 mar 2026 · versão 1.0" (a Política é feminina: "Aceita"). */
export function acceptedLabel(docType: LegalDocType, acceptedAt: string, version: string): string {
  const verb = docType === "privacy" || docType === "age_declaration" ? "Aceita" : "Aceito";
  const date = format(new Date(acceptedAt), "d MMM yyyy", { locale: ptBR }).replace(".", "");
  return `${verb} em ${date} · versão ${version}`;
}
