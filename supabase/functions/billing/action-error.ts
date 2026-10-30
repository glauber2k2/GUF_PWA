// Erros das ações de cobrança → resposta { code } que o app traduz (packages/api/src/billing.ts).
import { BillingConfigError, ProviderRequestError } from "../_shared/billing/provider.ts";
import { BillingStoreError } from "../_shared/billing/store.ts";

export type BillingErrorCode =
  | "billing_unavailable"
  | "billing_provider_error"
  | "subscription_not_found"
  | "subscription_already_active"
  | "subscription_documents_outdated"
  | "account_suspended"
  | "invalid_request"
  | "not_authenticated";

export class BillingActionError extends Error {
  constructor(readonly code: BillingErrorCode, readonly status: number) {
    super(code);
  }
}

const STORE_ERROR_CODES: Record<string, BillingActionError> = {
  GB000: new BillingActionError("billing_unavailable", 503),
  GB001: new BillingActionError("subscription_not_found", 404),
  GB004: new BillingActionError("subscription_already_active", 409),
  GU001: new BillingActionError("account_suspended", 403),
};

/** Qualquer falha → erro conhecido (o detalhe técnico vai só para o log, sem dados pessoais). */
export function toBillingActionError(error: unknown): BillingActionError {
  if (error instanceof BillingActionError) return error;
  if (error instanceof BillingStoreError && error.code && STORE_ERROR_CODES[error.code]) return STORE_ERROR_CODES[error.code];
  if (error instanceof BillingConfigError) {
    console.error("Cobrança: configuração ausente", { message: error.message });
    return new BillingActionError("billing_unavailable", 503);
  }
  if (error instanceof ProviderRequestError) {
    console.error("Cobrança: o gateway recusou", { status: error.status, code: error.providerCode });
    return new BillingActionError("billing_provider_error", 502);
  }
  console.error("Cobrança: falha inesperada", { message: (error as Error)?.message });
  return new BillingActionError("billing_provider_error", 500);
}
