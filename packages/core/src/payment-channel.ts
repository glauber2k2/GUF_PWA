/**
 * Canal de pagamento: dentro do app da Google Play (TWA) a assinatura é comprada pelo Google Play
 * Billing (exigência da Play para conteúdo digital); no navegador, pelo Stripe. Canal novo (ex.: app
 * iOS) = uma entrada em cada catálogo abaixo; as telas pedem ao catálogo e nunca testam o canal.
 */
import type { BillingProviderId } from "./billing";

export type PaymentChannelId = "web" | "play";

/** Plataforma gravada no aceite dos documentos (`accept_documents`). */
export type PaymentChannelPlatform = "web" | "android";

export interface PaymentChannel {
  id: PaymentChannelId;
  /** Gateway dos preços e da compra (`plan_prices.provider`). */
  provider: BillingProviderId;
  platform: PaymentChannelPlatform;
  /** Linha de confiança da oferta ("Pagamento seguro…"). */
  trustLine: string;
}

export const PAYMENT_CHANNELS: Record<PaymentChannelId, PaymentChannel> = {
  web: { id: "web", provider: "stripe", platform: "web", trustLine: "Pagamento seguro na página do Stripe" },
  play: { id: "play", provider: "google", platform: "android", trustLine: "Pagamento seguro pelo Google Play" },
};

/** O app da Play (TWA) abre o site com o referrer `android-app://<pacote>`. */
const ANDROID_APP_REFERRER = "android-app://";

/** A página foi aberta pelo app Android da Play? */
export function isAndroidAppReferrer(referrer: string): boolean {
  return referrer.startsWith(ANDROID_APP_REFERRER);
}

export interface SubscriptionManagement {
  /** "Pagamento pelo Stripe." · "Pagamento pelo Google Play." */
  paymentNote: string;
  /** Cartão, recibos e reativação ficam na própria loja (o app só abre a página dela). */
  isManagedInStore: boolean;
}

export const SUBSCRIPTION_MANAGEMENT: Record<BillingProviderId, SubscriptionManagement> = {
  stripe: { paymentNote: "Pagamento pelo Stripe.", isManagedInStore: false },
  google: { paymentNote: "Pagamento pelo Google Play.", isManagedInStore: true },
};

const PLAY_SUBSCRIPTIONS_URL = "https://play.google.com/store/account/subscriptions";

/** Página "Assinaturas" da Play (com o pacote, abre direto a do guf). */
export function playSubscriptionsUrl(packageName: string | null | undefined): string {
  if (!packageName) return PLAY_SUBSCRIPTIONS_URL;
  return `${PLAY_SUBSCRIPTIONS_URL}?package=${encodeURIComponent(packageName)}`;
}
