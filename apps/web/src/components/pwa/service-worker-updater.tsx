"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ScreenPortal, Toast } from "@/components/ds";

/**
 * Registra o service worker (/sw.js, gerado pelo `serwist build` só no build de produção)
 * e avisa quando há uma versão nova: "Nova versão do guf disponível · Atualizar".
 * A versão nova só assume ao tocar em "Atualizar" (nunca no meio de um treino sem o usuário pedir);
 * os dados do treino em andamento ficam no aparelho (Dexie/localStorage) e sobrevivem ao recarregar.
 */
export function ServiceWorkerUpdater() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const updating = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    let registration: ServiceWorkerRegistration | null = null;

    // Recarrega só quando o usuário pediu a atualização (a 1ª instalação também troca o controller).
    const onControllerChange = () => {
      if (updating.current) window.location.reload();
    };
    // Procura versão nova ao voltar para o app.
    const onVisible = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };
    const watch = (worker: ServiceWorker) =>
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && sw.controller) setWaiting(worker);
      });

    sw.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    sw.register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          if (reg.installing) watch(reg.installing);
        });
      })
      // Sem service worker o app continua funcionando (só não abre offline do zero).
      .catch(() => undefined);

    return () => {
      sw.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting) return null;
  return (
    <ScreenPortal>
      <div className="fixed inset-x-4 top-[calc(12px+env(safe-area-inset-top))] z-[80] mx-auto max-w-[398px] animate-guf-rise-fast">
        <Toast
          message="Nova versão do guf disponível"
          icon={RefreshCw}
          actionLabel="Atualizar"
          onAction={() => {
            updating.current = true;
            waiting.postMessage({ type: "SKIP_WAITING" });
          }}
        />
      </div>
    </ScreenPortal>
  );
}
