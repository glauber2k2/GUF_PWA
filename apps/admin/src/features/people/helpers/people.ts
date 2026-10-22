import { formatDayMonthYear } from "@guf/core";
import { withDevState } from "@/shared/helpers/dev-state-path";

/** /pessoas?q=…&id=… (busca e conta aberta ficam na URL: voltar e recarregar funcionam). */
export function peoplePath({ query, userId }: { query?: string; userId?: string | null }): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (userId) params.set("id", userId);
  const search = params.toString();
  return withDevState(search ? `/pessoas?${search}` : "/pessoas");
}

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

/** Nome para mostrar quando a pessoa não preencheu. */
export function displayName(name: string | null, handle: string | null): string {
  return name?.trim() || (handle ? `@${handle}` : "Sem nome");
}
