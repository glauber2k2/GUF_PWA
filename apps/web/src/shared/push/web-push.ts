import type { PushSubscriptionKeys } from "@guf/api";

/*
 * Inscrição deste aparelho no Web Push (avisos com o app fechado). Só no navegador, e só existe
 * quando o service worker está registrado (build de produção). No iPhone, só com o app instalado
 * na Tela de Início (iOS 16.4+).
 */

/**
 * Por que a inscrição falhou (depois da permissão dada): service-worker-missing (o site não registrou
 * service worker nenhum, ex.: /sw.js fora da publicação) · no-service-worker (existe, mas não ficou
 * ativo a tempo: app instalando ou atualizando) · invalid-key (chave pública VAPID do build com formato errado) ·
 * push-service (o serviço de push do navegador recusou, ex.: Brave com o push do Google desligado).
 */
export type DeviceSubscribeFailure = "service-worker-missing" | "no-service-worker" | "invalid-key" | "push-service";

/**
 * Resultado de inscrever o aparelho: inscrito · denied (permissão negada) · dismissed (fechou o
 * pedido sem escolher) · failed (com o motivo e o código do erro do navegador, para diagnóstico).
 */
export type DeviceSubscribeResult =
  | { status: "subscribed"; keys: PushSubscriptionKeys }
  | { status: "denied" }
  | { status: "dismissed" }
  | { status: "failed"; reason: DeviceSubscribeFailure; detail?: string };

/** Aparelho visto pelas telas: o real (abaixo) ou o simulado de desenvolvimento (mocks/push.ts). */
export interface DevicePush {
  isSupported: () => boolean;
  getPermission: () => NotificationPermission;
  getCurrent: () => Promise<PushSubscriptionKeys | null>;
  /** Pede a permissão (precisa vir de um toque) e inscreve o aparelho. */
  subscribe: () => Promise<DeviceSubscribeResult>;
  unsubscribe: () => Promise<void>;
}

/** Chave P-256 não comprimida: 65 bytes começando em 0x04. */
const VAPID_KEY_BYTES = 65;
const UNCOMPRESSED_POINT_PREFIX = 0x04;

/**
 * Chave pública como veio do ambiente, sem o que costuma sobrar ao colar no painel da hospedagem:
 * espaços, aspas e o próprio nome da variável ("NEXT_PUBLIC_VAPID_PUBLIC_KEY=…").
 */
export function normalizeVapidKey(raw: string): string {
  return raw
    .trim()
    .replace(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY\s*=\s*/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

/** Chave pública VAPID do servidor (a privada fica só nos secrets da Edge Function). */
const VAPID_PUBLIC_KEY = normalizeVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");

/** Espera pelo service worker ativo (logo depois de instalar o app ou de uma atualização ele ainda está subindo). */
const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;

/** O navegador e o build têm o necessário para receber avisos. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    VAPID_PUBLIC_KEY !== "" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Permissão de notificações deste site no aparelho. */
export function getNotificationPermission(): NotificationPermission {
  return isPushSupported() ? Notification.permission : "denied";
}

/** Inscrição atual deste aparelho (null sem service worker ou sem inscrição). */
export async function getDevicePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Converte a inscrição do navegador no formato gravado no servidor. */
export function toPushSubscriptionKeys(subscription: PushSubscription): PushSubscriptionKeys | null {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) return null;
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

/** Chave em bytes, ou null se não for uma chave pública P-256 válida (base64url de 65 bytes). */
function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return bytes.length === VAPID_KEY_BYTES && bytes[0] === UNCOMPRESSED_POINT_PREFIX ? bytes : null;
  } catch {
    return null;
  }
}

function sameBytes(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const view = new Uint8Array(a);
  return view.every((byte, i) => byte === b[i]);
}

/** Código do erro do navegador ("AbortError", "InvalidAccessError"…), para o aviso e o suporte. */
function errorCode(error: unknown): string {
  return error instanceof Error ? error.name : "Erro";
}

/**
 * Service worker ATIVO: `pushManager.subscribe` falha com um worker ainda instalando ou esperando,
 * o que `getRegistration()` devolveria. null se não ficar pronto a tempo.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

/**
 * Pede a permissão (precisa vir de um toque) e inscreve o aparelho.
 * @returns a inscrição ou o motivo de não ter inscrito (negou, fechou o pedido ou falhou).
 */
export async function subscribeDevicePush(): Promise<DeviceSubscribeResult> {
  if (!isPushSupported()) return { status: "failed", reason: "push-service", detail: "sem suporte" };
  const applicationServerKey = toApplicationServerKey(VAPID_PUBLIC_KEY);
  if (!applicationServerKey) return { status: "failed", reason: "invalid-key" };
  const permission = await Notification.requestPermission();
  if (permission === "denied") return { status: "denied" };
  if (permission !== "granted") return { status: "dismissed" };

  // Sem registro nenhum, esperar o "ready" não adianta: o service worker não existe neste site.
  if (!(await navigator.serviceWorker.getRegistration().catch(() => undefined))) return { status: "failed", reason: "service-worker-missing" };
  const registration = await getActiveRegistration().catch(() => null);
  if (!registration) return { status: "failed", reason: "no-service-worker" };
  try {
    let subscription = await registration.pushManager.getSubscription();
    // Inscrição antiga feita com outra chave (troca de chaves): o servidor não conseguiria enviar.
    if (subscription && !sameBytes(subscription.options.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const keys = toPushSubscriptionKeys(subscription);
    return keys ? { status: "subscribed", keys } : { status: "failed", reason: "push-service", detail: "inscrição sem chaves" };
  } catch (error) {
    // InvalidAccessError = o navegador não aceitou a chave; o resto vem do serviço de push.
    const code = errorCode(error);
    return { status: "failed", reason: code === "InvalidAccessError" ? "invalid-key" : "push-service", detail: code };
  }
}

/** Cancela a inscrição no navegador: o endereço antigo deixa de receber qualquer aviso. */
export async function unsubscribeDevicePush(): Promise<void> {
  const subscription = await getDevicePushSubscription().catch(() => null);
  await subscription?.unsubscribe().catch(() => false);
}

export const devicePush: DevicePush = {
  isSupported: isPushSupported,
  getPermission: getNotificationPermission,
  getCurrent: async () => {
    const subscription = await getDevicePushSubscription();
    return subscription && toPushSubscriptionKeys(subscription);
  },
  subscribe: subscribeDevicePush,
  unsubscribe: unsubscribeDevicePush,
};
