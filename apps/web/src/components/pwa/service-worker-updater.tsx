"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ScreenPortal, Toast } from "@/components/ds";
import { applyUpdate, initPwa, usePwaState } from "@/lib/pwa/pwa-store";

/**
 * Liga o PWA (convite de instalação + service worker) e avisa quando há versão nova:
 * "Nova versão do guf disponível · Atualizar". A versão nova só assume ao tocar em "Atualizar"
 * (nunca no meio de um treino sem o usuário pedir); os dados do treino ficam no aparelho.
 */
export function ServiceWorkerUpdater() {
  const { waitingWorker } = usePwaState();

  useEffect(() => {
    initPwa();
  }, []);

  if (!waitingWorker) return null;
  return (
    <ScreenPortal>
      <div className="fixed inset-x-4 top-[calc(12px+env(safe-area-inset-top))] z-[80] mx-auto max-w-[398px] animate-guf-rise-fast">
        <Toast tone="info" title="Nova versão do guf disponível" icon={RefreshCw} actionLabel="Atualizar" onAction={applyUpdate} />
      </div>
    </ScreenPortal>
  );
}
