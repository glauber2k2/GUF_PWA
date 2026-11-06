// Adaptador do Google Play Billing (assinaturas compradas no app Android / TWA).
// Diferenças do Stripe, todas escondidas aqui:
//  * Não há cliente nem página de pagamento: o app compra pela loja e o servidor confere e confirma
//    (acknowledge). O dono vem do vínculo gravado no banco (billing_purchase_links).
//  * "Encerrar agora" = parar a renovação. O acesso termina com a devolução com revogação
//    (orders.refund?revoke=true, usada na desistência em 7 dias) ou no fim do período.
//  * Reativar uma assinatura cancelada só a própria pessoa faz, na Play (UnsupportedOperationError).
//  * O Google não informa o valor devolvido: a devolução é sempre do pedido inteiro.
// Secrets: GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT, GOOGLE_PLAY_RTDN_TOKEN.
import {
  ProviderRequestError,
  UnsupportedOperationError,
  type ProviderRefundState,
  type StorePurchaseProvider,
} from "../../provider.ts";
import { createPlayClient, type PlayClient } from "./play-client.ts";
import { parsePlayNotification } from "./play-rtdn.ts";
import {
  isAcknowledged,
  productIdOf,
  toProviderPayment,
  toProviderSubscription,
  type PlaySubscriptionV2,
} from "./play-subscription.ts";

/**
 * Devolução do Google = pedido inteiro, sem valor na notificação. O banco limita o devolvido ao valor
 * do pagamento (billing_record_refunds), então "o maior inteiro" marca o pagamento como devolvido.
 */
const FULL_REFUND_CENTS = 2_147_483_647;

/** O Google responde 400 ao devolver de novo um pedido já devolvido: para o guf, já está feito. */
function isAlreadyRefunded(error: unknown): boolean {
  return error instanceof ProviderRequestError && error.status === 400 && /refund/i.test(error.message) && /already/i.test(error.message);
}

const tokenPath = (purchaseToken: string) => `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
const legacyTokenPath = (productId: string, purchaseToken: string, action: string) =>
  `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:${action}`;

export function createGooglePlayProvider(): StorePurchaseProvider {
  const client: PlayClient = createPlayClient();
  const readSubscription = (purchaseToken: string) => client.get<PlaySubscriptionV2>(tokenPath(purchaseToken));

  /** Para a renovação automática (a assinatura segue até o fim do período). */
  async function stopRenewal(purchaseToken: string): Promise<void> {
    const subscription = await readSubscription(purchaseToken);
    await client.post(legacyTokenPath(productIdOf(subscription), purchaseToken, "cancel"));
  }

  return {
    id: "google",

    async getStorePurchase(purchaseRef) {
      const subscription = await readSubscription(purchaseRef);
      return {
        productRef: productIdOf(subscription),
        isAcknowledged: isAcknowledged(subscription),
        subscription: toProviderSubscription(purchaseRef, subscription),
      };
    },

    async acknowledgePurchase({ purchaseRef, productRef }) {
      await client.post(legacyTokenPath(productRef, purchaseRef, "acknowledge"));
    },

    async getSubscription(subscriptionRef) {
      return toProviderSubscription(subscriptionRef, await readSubscription(subscriptionRef));
    },

    async setCancelAtPeriodEnd(subscriptionRef, cancel) {
      if (!cancel) throw new UnsupportedOperationError("Reativar assinatura do Google Play só pela própria Play");
      await stopRenewal(subscriptionRef);
    },

    cancelNow: stopRenewal,

    async getPayment(paymentRef) {
      return toProviderPayment(paymentRef, await readSubscription(paymentRef));
    },

    async getRefundState(ref): Promise<ProviderRefundState> {
      return { paymentRef: ref, refundedCents: FULL_REFUND_CENTS, refunds: [] };
    },

    async refund({ paymentRef }) {
      try {
        await client.post(`/orders/${encodeURIComponent(paymentRef)}:refund`, {}, { revoke: "true" });
      } catch (error) {
        if (!isAlreadyRefunded(error)) throw error;
      }
      return { ref: `refund-${paymentRef}`, status: "succeeded" };
    },

    async parseEvent(rawBody, _headers, requestUrl) {
      return parsePlayNotification(rawBody, requestUrl, client.packageName);
    },
  };
}
