"use client";

import { useSyncExternalStore } from "react";
import { installPlatform, type InstallPlatform } from "@guf/core";

/*
 * Estado do PWA (um por aba), iniciado uma vez no layout raiz (initPwa):
 * - convite de instalação do navegador (beforeinstallprompt dispara uma vez, cedo);
 * - app aberto como instalado (display-mode standalone);
 * - service worker com versão nova esperando ("Nova versão disponível · Atualizar").
 */

/** Evento de instalação do Chromium (não está nos tipos do DOM). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  installPrompt: BeforeInstallPromptEvent | null;
  standalone: boolean;
  waitingWorker: ServiceWorker | null;
}

const SERVER_STATE: PwaState = { installPrompt: null, standalone: false, waitingWorker: null };
let state: PwaState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;
/** A troca de versão só recarrega a página quando o usuário pediu "Atualizar". */
let updating = false;

function set(next: Partial<PwaState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function registerServiceWorker() {
  // O /sw.js só existe no build de produção (gerado pelo `serwist build`).
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  let registration: ServiceWorkerRegistration | null = null;
  const watch = (worker: ServiceWorker) =>
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && sw.controller) set({ waitingWorker: worker });
    });

  sw.addEventListener("controllerchange", () => {
    if (updating) window.location.reload();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
  });
  sw.register("/sw.js", { scope: "/" })
    .then((reg) => {
      registration = reg;
      if (reg.waiting && sw.controller) set({ waitingWorker: reg.waiting });
      reg.addEventListener("updatefound", () => {
        if (reg.installing) watch(reg.installing);
      });
    })
    // Sem service worker o app continua funcionando (só não abre offline do zero).
    .catch(() => undefined);
}

/** Liga os eventos do PWA e registra o service worker (uma vez por aba). */
export function initPwa() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ standalone: isStandalone() });
  window.addEventListener("beforeinstallprompt", (event) => {
    // Guarda o convite para o botão "Instalar app" (sem a barra automática do navegador).
    event.preventDefault();
    set({ installPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ installPrompt: null, standalone: true }));
  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => set({ standalone: isStandalone() }));
  registerServiceWorker();
}

/** Abre o convite nativo de instalação. true = o usuário aceitou. */
export async function promptInstall(): Promise<boolean> {
  const event = state.installPrompt;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // O convite só pode ser usado uma vez.
  set({ installPrompt: null, ...(outcome === "accepted" && { standalone: true }) });
  return outcome === "accepted";
}

/** Aplica a versão nova do app (o service worker assume e a página recarrega). */
export function applyUpdate() {
  if (!state.waitingWorker) return;
  updating = true;
  state.waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => state,
    () => SERVER_STATE,
  );
}

/** Plataforma de instalação deste aparelho (ver installPlatform em @guf/core). */
export function useInstallPlatform(): InstallPlatform {
  const pwa = usePwaState();
  if (typeof navigator === "undefined") return "unsupported";
  return installPlatform({
    userAgent: navigator.userAgent,
    standalone: pwa.standalone,
    hasInstallPrompt: Boolean(pwa.installPrompt),
    maxTouchPoints: navigator.maxTouchPoints,
  });
}
