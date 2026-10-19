/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

/*
 * Service worker do guf (Serwist). Gerado no build: `serwist build` empacota este arquivo e injeta
 * em self.__SW_MANIFEST a lista de arquivos do site exportado (apps/web/out). Ver serwist.config.mjs.
 *
 * - Pré-cache do app inteiro (HTML, JS, CSS, fontes, ícones e payloads .txt da navegação):
 *   o app instalado abre sem internet. Os dados do treino offline continuam no Dexie (IndexedDB).
 * - NÃO guarda respostas do Supabase: dados do usuário nunca ficam no cache do service worker.
 * - Atualização sob controle do usuário: a versão nova espera ("waiting") até o app pedir SKIP_WAITING
 *   (aviso "Nova versão disponível · Atualizar").
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Rotas com query string (/treino/?id=…, /rotina/?projeto=…) usam o mesmo HTML estático.
    ignoreURLParametersMatching: [/.*/],
    directoryIndex: "index.html",
    cleanupOutdatedCaches: true,
  },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
  // Página não guardada e sem internet: abre a Início (o app cuida do estado offline).
  fallbacks: {
    entries: [{ url: "/index.html", matcher: ({ request }) => request.destination === "document" }],
  },
});

/** Aviso enviado pela Edge Function push-alerts (texto pronto em português). */
interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

self.addEventListener("push", (event) => {
  const payload = event.data?.json() as PushPayload | undefined;
  if (!payload?.title) return;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

// Tocar no aviso: volta para o app aberto (na tela do aviso) ou abre um novo.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data as { url?: string } | null)?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      if (open) return open.focus().then((client) => client.navigate(url)).catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
