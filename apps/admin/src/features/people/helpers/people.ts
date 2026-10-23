import { formatDayMonthYear } from "@guf/core";
import { withDevState } from "@/shared/helpers/dev-state-path";

export { displayName } from "@/shared/helpers/display-name";

/** /pessoas?q=…&id=… (busca e conta aberta ficam na URL: voltar e recarregar funcionam). */
export function peoplePath({ query, userId }: { query?: string; userId?: string | null }): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (userId) params.set("id", userId);
  const search = params.toString();
  return withDevState(search ? `/pessoas?${search}` : "/pessoas");
}

/** Campos que a equipe edita, cada um no seu diálogo (Mudar plano, Editar @, Editar nome). */
export type EditField = "plan" | "handle" | "name";

export const DOCUMENT_LABELS: Record<string, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  age_declaration: "Declaração de idade",
  subscription_terms: "Termos da Assinatura",
};

export const GRANT_SOURCE_LABELS: Record<string, string> = {
  subscription: "Pagamento no app",
  manual: "Equipe (manual)",
  trial: "Período de teste",
};

/** "12 mar 2026" a partir de um instante ISO. */
export function formatDate(iso: string): string {
  return formatDayMonthYear(new Date(iso));
}
