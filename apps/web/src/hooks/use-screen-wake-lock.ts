"use client";

import { useEffect } from "react";
import { createDevicePreference } from "@/lib/device-preference";

/*
 * Manter a tela ligada durante o treino (Screen Wake Lock API): a tela não apaga sozinha, então o app
 * continua rodando e o aviso de fim do descanso toca. Não impede o usuário de bloquear no botão.
 * O sistema solta o bloqueio quando o app sai da tela; ele é pedido de novo ao voltar.
 * Navegador sem suporte: segue normal, sem a tela ligada.
 */

export const keepScreenOnPreference = createDevicePreference<"on" | "off">("guf.keep-screen-on", ["on", "off"], "on");

export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let stopped = false;

    const acquire = async () => {
      if (stopped || pending || document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release().catch(() => {});
        else sentinel = next;
      } catch {
        // Recusado (economia de bateria, aba sem foco etc.): tenta de novo ao voltar para o app.
      } finally {
        pending = false;
      }
    };

    void acquire();
    const onVisibility = () => void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
