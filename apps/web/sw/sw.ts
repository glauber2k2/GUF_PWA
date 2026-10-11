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

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
