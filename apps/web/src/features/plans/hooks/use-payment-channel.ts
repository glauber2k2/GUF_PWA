"use client";

import { useSyncExternalStore } from "react";
import { PAYMENT_CHANNELS, type PaymentChannel, type PaymentChannelId } from "@guf/core";
import { detectPaymentChannel } from "@/features/plans/helpers/payment-channel";

/** O canal não muda durante a sessão: não há o que observar. */
const subscribeToNothing = () => () => {};
const serverChannel = (): PaymentChannelId => "web";

/**
 * Canal de pagamento desta sessão (app da Play → Google Play; navegador → Stripe). Na geração
 * estática vale o da web; no navegador, o detectado (sem diferença na hidratação).
 */
export function usePaymentChannel(): PaymentChannel {
  return PAYMENT_CHANNELS[useSyncExternalStore(subscribeToNothing, detectPaymentChannel, serverChannel)];
}
