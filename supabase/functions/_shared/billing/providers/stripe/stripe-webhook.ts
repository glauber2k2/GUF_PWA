// Conferência da assinatura do webhook do Stripe (cabeçalho Stripe-Signature, HMAC-SHA256) com Web Crypto.
// Referência: https://docs.stripe.com/webhooks#verify-manually
import { InvalidWebhookError } from "../../provider.ts";

/** Evento mais velho que isso é recusado (evita reenvio de um evento capturado). */
const SIGNATURE_TOLERANCE_SECONDS = 300;

function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } {
  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  return { timestamp, signatures };
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante (não vaza quantos caracteres conferem). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Lança `InvalidWebhookError` se o corpo não foi assinado pelo Stripe com este segredo há pouco tempo. */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Date.now() / 1000): Promise<void> {
  if (!header) throw new InvalidWebhookError("Sem assinatura");
  const { timestamp, signatures } = parseSignatureHeader(header);
  if (!Number.isFinite(timestamp) || signatures.length === 0) throw new InvalidWebhookError("Assinatura malformada");
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) throw new InvalidWebhookError("Evento fora do prazo");

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!signatures.some((signature) => timingSafeEqual(signature, expected))) throw new InvalidWebhookError("Assinatura não confere");
}
