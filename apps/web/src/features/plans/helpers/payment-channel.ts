import { isAndroidAppReferrer, type PaymentChannelId } from "@guf/core";

/** Guardado na sessão: o referrer do app da Play só existe na primeira página aberta por ele. */
const CHANNEL_STORAGE_KEY = "guf.payment-channel";

function readStoredChannel(): PaymentChannelId | null {
  try {
    const stored = sessionStorage.getItem(CHANNEL_STORAGE_KEY);
    return stored === "play" || stored === "web" ? stored : null;
  } catch {
    return null;
  }
}

function storeChannel(channel: PaymentChannelId): void {
  try {
    sessionStorage.setItem(CHANNEL_STORAGE_KEY, channel);
  } catch {
    // Sem armazenamento (aba privada): o referrer continua valendo enquanto a página não recarregar.
  }
}

/** Canal desta sessão: app da Play (TWA) ou navegador. Só no cliente. */
export function detectPaymentChannel(): PaymentChannelId {
  const stored = readStoredChannel();
  if (stored) return stored;
  const channel: PaymentChannelId = isAndroidAppReferrer(document.referrer) ? "play" : "web";
  storeChannel(channel);
  return channel;
}
