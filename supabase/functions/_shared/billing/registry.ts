// Gateways disponíveis. Trocar ou somar gateway = um adaptador + uma entrada aqui (nada mais muda).
import {
  BillingConfigError,
  isHostedCheckoutProvider,
  isStorePurchaseProvider,
  type BillingProvider,
  type HostedCheckoutProvider,
  type ProviderId,
  type StorePurchaseProvider,
} from "./provider.ts";
import { createGooglePlayProvider } from "./providers/google-play/play-provider.ts";
import { createStripeProvider } from "./providers/stripe/stripe-provider.ts";

const BILLING_PROVIDERS: Record<ProviderId, () => BillingProvider> = {
  stripe: createStripeProvider,
  google: createGooglePlayProvider,
};

export function isProviderId(value: string | null): value is ProviderId {
  return value !== null && Object.hasOwn(BILLING_PROVIDERS, value);
}

/** Adaptador de um gateway (lança BillingConfigError sem os secrets dele). */
export function billingProviderFor(id: ProviderId): BillingProvider {
  return BILLING_PROVIDERS[id]();
}

/** Gateway com página de pagamento (vendas na web). */
export function hostedCheckoutProviderFor(id: ProviderId): HostedCheckoutProvider {
  const provider = billingProviderFor(id);
  if (!isHostedCheckoutProvider(provider)) throw new BillingConfigError(`O gateway ${id} não tem página de pagamento`);
  return provider;
}

/** Gateway de loja de apps (compras feitas no app Android). */
export function storePurchaseProviderFor(id: ProviderId): StorePurchaseProvider {
  const provider = billingProviderFor(id);
  if (!isStorePurchaseProvider(provider)) throw new BillingConfigError(`O gateway ${id} não é uma loja de apps`);
  return provider;
}

/** Gateway das vendas novas na web (secret BILLING_PROVIDER; padrão: stripe). */
export function activeProviderId(): ProviderId {
  const configured = Deno.env.get("BILLING_PROVIDER") ?? "stripe";
  return isProviderId(configured) ? configured : "stripe";
}
