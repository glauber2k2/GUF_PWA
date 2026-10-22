"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createToastStore, TOAST_DURATION_MS, ToastStack, type ToastOptions } from "@guf/ui";

type ShowToast = (title: string, options?: ToastOptions) => number;

const ToastContext = createContext<ShowToast | null>(null);

/** Pilha de avisos do painel (mesmo componente do app). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createToastStore());
  return (
    <ToastContext.Provider value={store.show}>
      {children}
      <ToastStack store={store} duration={TOAST_DURATION_MS} />
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return show;
}
