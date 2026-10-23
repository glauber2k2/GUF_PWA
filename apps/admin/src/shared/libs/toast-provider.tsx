"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createToastStore, ScreenPortal, TOAST_DURATION_MS, ToastStack, type ToastOptions } from "@guf/ui";

type ShowToast = (title: string, options?: ToastOptions) => number;

const ToastContext = createContext<ShowToast | null>(null);

/** Pilha de avisos do painel (mesmo componente do app). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createToastStore());
  return (
    <ToastContext.Provider value={store.show}>
      {children}
      {/* Celular: embaixo, acima da barra de ações. Tablet e computador: canto inferior direito, largura fixa. */}
      <ScreenPortal>
        <ToastStack
          store={store}
          duration={TOAST_DURATION_MS}
          className="fixed inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[65] mx-auto max-w-[406px] md:inset-x-auto md:right-6 md:bottom-6 md:mx-0 md:w-[380px]"
        />
      </ScreenPortal>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return show;
}
