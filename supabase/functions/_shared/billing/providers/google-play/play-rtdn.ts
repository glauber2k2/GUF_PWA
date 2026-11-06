// Avisos em tempo real do Google Play (RTDN): mensagem do Pub/Sub (push) → evento normalizado.
// O Pub/Sub não envia cabeçalho próprio: a origem é conferida por um segredo na URL do push
// (secret GOOGLE_PLAY_RTDN_TOKEN). Mesmo assim, cada evento é relido na API do Google antes de gravar.
// Referência: https://developer.android.com/google/play/billing/rtdn-reference
import { InvalidWebhookError, type BillingEvent } from "../../provider.ts";
import { timingSafeEqual } from "../../timing-safe.ts";

interface PubSubPush {
  message?: { data?: string; messageId?: string };
}

interface DeveloperNotification {
  packageName?: string;
  subscriptionNotification?: { notificationType: number; purchaseToken: string };
  voidedPurchaseNotification?: { purchaseToken: string; orderId: string };
  testNotification?: unknown;
}

/** Tipos que trazem cobrança nova: RECOVERED, RENEWED, PURCHASED, RESTARTED. */
const PAYMENT_NOTIFICATION_TYPES = new Set([1, 2, 4, 7]);

function verifyPushToken(requestUrl: URL): void {
  const expected = Deno.env.get("GOOGLE_PLAY_RTDN_TOKEN");
  const received = requestUrl.searchParams.get("token") ?? "";
  if (!expected || !timingSafeEqual(received, expected)) throw new InvalidWebhookError("Token do aviso não confere");
}

function decodeNotification(rawBody: string): { messageId: string; notification: DeveloperNotification } {
  const push = JSON.parse(rawBody) as PubSubPush;
  const data = push.message?.data;
  const messageId = push.message?.messageId;
  if (!data || !messageId) throw new InvalidWebhookError("Mensagem do Pub/Sub incompleta");
  return { messageId, notification: JSON.parse(atob(data)) as DeveloperNotification };
}

/** Confere e normaliza o aviso; pacote de outro app → InvalidWebhookError. */
export function parsePlayNotification(rawBody: string, requestUrl: URL, packageName: string): BillingEvent {
  verifyPushToken(requestUrl);
  const { messageId, notification } = decodeNotification(rawBody);
  if (notification.packageName !== packageName) throw new InvalidWebhookError("Aviso de outro app");

  const subscription = notification.subscriptionNotification;
  if (subscription) {
    const type = `subscription.${subscription.notificationType}`;
    return PAYMENT_NOTIFICATION_TYPES.has(subscription.notificationType)
      ? { id: messageId, type, kind: "payment_succeeded", paymentRef: subscription.purchaseToken }
      : { id: messageId, type, kind: "subscription_changed", subscriptionRef: subscription.purchaseToken };
  }
  const voided = notification.voidedPurchaseNotification;
  if (voided) return { id: messageId, type: "voided_purchase", kind: "refund_changed", ref: voided.orderId };
  return { id: messageId, type: notification.testNotification ? "test" : "other", kind: "ignored" };
}
