"use client";

import { useSyncExternalStore } from "react";
import type { AccountSuspension } from "@guf/api";

/*
 * Conta suspensa detectada pelo cliente Supabase (erro GU001 do middleware do banco).
 * Fica fora do React porque quem avisa é o `fetch` do cliente (shared/libs/supabase.ts) e quem
 * mostra o aviso é a feature de autenticação. Só a primeira detecção vale: as chamadas que
 * falharem depois dela não reiniciam a contagem do aviso.
 */
let current: AccountSuspension | null = null;
const listeners = new Set<() => void>();

export function reportAccountSuspension(suspension: AccountSuspension): void {
  if (current) return;
  current = suspension;
  listeners.forEach((l) => l());
}

/** Depois de sair da conta: a próxima pessoa no aparelho começa sem o aviso. */
export function clearAccountSuspension(): void {
  if (!current) return;
  current = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Suspensão detectada nesta abertura do app, ou `null`. */
export function useAccountSuspension(): AccountSuspension | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
