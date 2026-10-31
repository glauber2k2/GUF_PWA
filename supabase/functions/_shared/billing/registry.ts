// Gateways disponíveis. Trocar ou somar gateway = um adaptador + uma entrada aqui (nada mais muda).
import type { BillingProvider, ProviderId } from "./provider.ts";
import { createStripeProvider } from "./providers/stripe/stripe-provider.ts";

const BILLING_PROVIDERS: Record<ProviderId, () => BillingProvider> = {
  stripe: createStripeProvider,
};

export function isProviderId(value: string | null): value is ProviderId {
  return value !== null && Object.hasOwn(BILLING_PROVIDERS, value);
}

/** Adaptador de um gateway (lança BillingConfigError sem os secrets dele). */
export function billingProviderFor(id: ProviderId): BillingProvider {
  return BILLING_PROVIDERS[id]();
}

/** Gateway das vendas novas (secret BILLING_PROVIDER; padrão: stripe). */
export function activeProviderId(): ProviderId {
  const configured = Deno.env.get("BILLING_PROVIDER") ?? "stripe";
  return isProviderId(configured) ? configured : "stripe";
}
