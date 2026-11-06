/**
 * Google Play Billing dentro do app da Play (TWA), pela Digital Goods API + Payment Request do Chrome.
 * Só funciona no app instalado pela Play com o faturamento ligado no Bubblewrap (docs/play-store-twa.md).
 * Referência: https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing
 */
import { apiError, type ApiError } from "@guf/api";

const PLAY_BILLING_METHOD = "https://play.google.com/billing";
/** A Play define o preço; o Payment Request só exige um total válido. */
const PLACEHOLDER_TOTAL = { label: "Total", amount: { currency: "BRL", value: "0" } };

interface PlayPurchase {
  itemId: string;
  purchaseToken: string;
}

interface DigitalGoodsService {
  listPurchases(): Promise<PlayPurchase[]>;
}

type DigitalGoodsWindow = Window & { getDigitalGoodsService?: (method: string) => Promise<DigitalGoodsService> };

/** Compra concluída na Play: o token vai ao servidor; `finish` fecha a janela da Play com o resultado. */
export interface PlayPurchaseResult {
  purchaseToken: string;
  finish: (isConfirmed: boolean) => Promise<void>;
}

/** A pessoa fechou a janela da Play sem comprar (não é erro para mostrar). */
export class PlayPurchaseCanceledError extends Error {}

function digitalGoodsWindow(): DigitalGoodsWindow | null {
  return typeof window === "undefined" ? null : (window as DigitalGoodsWindow);
}

/** Este aparelho compra pela Play? (app da Play com o faturamento ligado) */
export function isPlayBillingSupported(): boolean {
  const target = digitalGoodsWindow();
  return Boolean(target?.getDigitalGoodsService && "PaymentRequest" in target);
}

async function digitalGoodsService(): Promise<DigitalGoodsService> {
  const getService = digitalGoodsWindow()?.getDigitalGoodsService;
  if (!getService) throw unavailableError();
  try {
    return await getService(PLAY_BILLING_METHOD);
  } catch {
    throw unavailableError();
  }
}

function unavailableError(): ApiError {
  return apiError("store_billing_unavailable");
}

/** Abre a compra da assinatura na Play. Fechar sem comprar → PlayPurchaseCanceledError. */
export async function purchasePlaySubscription(productId: string): Promise<PlayPurchaseResult> {
  await digitalGoodsService();
  const request = new PaymentRequest([{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: productId } }], { total: PLACEHOLDER_TOTAL });
  let response: PaymentResponse;
  try {
    response = await request.show();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new PlayPurchaseCanceledError();
    throw unavailableError();
  }
  const purchaseToken = (response.details as { purchaseToken?: string } | null)?.purchaseToken;
  if (!purchaseToken) {
    await response.complete("fail");
    throw apiError("store_purchase_invalid");
  }
  return { purchaseToken, finish: (isConfirmed) => response.complete(isConfirmed ? "success" : "fail") };
}

/** Assinaturas ativas na Play deste aparelho (para confirmar uma compra que não chegou ao servidor). */
export async function listPlayPurchases(): Promise<PlayPurchase[]> {
  return (await digitalGoodsService()).listPurchases();
}
