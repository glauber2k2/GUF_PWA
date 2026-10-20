import type { PushSubscriptionKeys } from "@guf/api";

/*
 * Inscrição deste aparelho no Web Push (avisos com o app fechado). Só no navegador, e só existe
 * quando o service worker está registrado (build de produção). No iPhone, só com o app instalado
 * na Tela de Início (iOS 16.4+).
 */

/**
 * Resultado de inscrever o aparelho: inscrito · denied (permissão negada) · dismissed (fechou o
 * pedido sem escolher) · failed (permissão dada, mas o service worker não ficou pronto ou o serviço
 * de push recusou).
 */
export type DeviceSubscribeResult =
  | { status: "subscribed"; keys: PushSubscriptionKeys }
  | { status: "denied" }
  | { status: "dismissed" }
  | { status: "failed" };

/** Aparelho visto pelas telas: o real (abaixo) ou o simulado de desenvolvimento (mocks/push.ts). */
export interface DevicePush {
  isSupported: () => boolean;
  getPermission: () => NotificationPermission;
  getCurrent: () => Promise<PushSubscriptionKeys | null>;
  /** Pede a permissão (precisa vir de um toque) e inscreve o aparelho. */
  subscribe: () => Promise<DeviceSubscribeResult>;
  unsubscribe: () => Promise<void>;
}

/** Chave pública VAPID do servidor (a privada fica só nos secrets da Edge Function). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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

function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
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
  if (!isPushSupported()) return { status: "failed" };
  const permission = await Notification.requestPermission();
  if (permission === "denied") return { status: "denied" };
  if (permission !== "granted") return { status: "dismissed" };
  try {
    const registration = await getActiveRegistration();
    if (!registration) return { status: "failed" };
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY) }));
    const keys = toPushSubscriptionKeys(subscription);
    return keys ? { status: "subscribed", keys } : { status: "failed" };
  } catch {
    // Serviço de push indisponível ou recusou (ex.: sem internet no momento, navegador sem suporte real).
    return { status: "failed" };
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
