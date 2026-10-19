import type { PushSubscriptionKeys } from "@guf/api";

/*
 * Inscrição deste aparelho no Web Push (avisos com o app fechado). Só no navegador, e só existe
 * quando o service worker está registrado (build de produção). No iPhone, só com o app instalado
 * na Tela de Início (iOS 16.4+).
 */

/** Aparelho visto pelas telas: o real (abaixo) ou o simulado de desenvolvimento (mocks/push.ts). */
export interface DevicePush {
  isSupported: () => boolean;
  getPermission: () => NotificationPermission;
  getCurrent: () => Promise<PushSubscriptionKeys | null>;
  /** Pede a permissão e inscreve; null = permissão negada ou sem service worker. */
  subscribe: () => Promise<PushSubscriptionKeys | null>;
  unsubscribe: () => Promise<void>;
}

/** Chave pública VAPID do servidor (a privada fica só nos secrets da Edge Function). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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
 * Pede a permissão (precisa vir de um toque) e inscreve o aparelho.
 * @returns a inscrição, ou null se a pessoa negou a permissão ou o aparelho não tem service worker.
 */
export async function subscribeDevicePush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if ((await Notification.requestPermission()) !== "granted") return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const current = await registration.pushManager.getSubscription();
  if (current) return current;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY) });
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
  subscribe: async () => {
    const subscription = await subscribeDevicePush();
    return subscription && toPushSubscriptionKeys(subscription);
  },
  unsubscribe: unsubscribeDevicePush,
};
