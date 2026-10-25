"use client";

import { useCallback, useEffect, useState } from "react";
import { ACCOUNT_SUSPENDED_NOTICE_SECONDS } from "@guf/core";
import { signOut } from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { clearAccountSuspension } from "@/store/global/account-suspension.store";

/** Login com o aviso de conta suspensa (a pessoa sabe por que saiu ao chegar lá). */
export const ACCOUNT_SUSPENDED_PATH = "/login/?conta-suspensa=1";

const TICK_MS = 250;
const SECOND_MS = 1000;

/**
 * Contagem do aviso de conta suspensa e a saída da conta ao fim dela (ou no toque em "Sair agora").
 * Sai sem enviar a fila offline: a API recusa tudo da conta suspensa (o SIGNED_OUT limpa o aparelho).
 * @param isActive true enquanto o aviso estiver na tela.
 */
export function useSuspendedSignOut(isActive: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(ACCOUNT_SUSPENDED_NOTICE_SECONDS);
  const [isLeaving, setIsLeaving] = useState(false);

  const leave = useCallback(async () => {
    setIsLeaving(true);
    await signOut(getSupabaseClient());
    clearAccountSuspension();
    // Recarrega a página: nenhuma tela da conta suspensa fica montada por trás do login.
    window.location.replace(ACCOUNT_SUSPENDED_PATH);
  }, []);

  // Prazo fixo a partir de quando o aviso apareceu: a aba em segundo plano não atrasa a saída.
  useEffect(() => {
    if (!isActive || isLeaving) return;
    const deadline = Date.now() + ACCOUNT_SUSPENDED_NOTICE_SECONDS * SECOND_MS;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / SECOND_MS));
      setSecondsLeft(left);
      if (left > 0) return;
      clearInterval(timer);
      void leave();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isActive, isLeaving, leave]);

  return { secondsLeft, isLeaving, leave };
}
