"use client";

import { useEffect, useState } from "react";
import { setRecoverySession } from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";

export type RecoveryState = { status: "checking" } | { status: "ready" } | { status: "invalid"; message: string };

/**
 * Abre a sessão pelo link de "criar senha nova" (#access_token=…&type=recovery) uma vez ao carregar
 * e tira os tokens do endereço (não ficam no histórico nem em print da tela).
 */
export function useRecoverySession(): RecoveryState {
  const [state, setState] = useState<RecoveryState>({ status: "checking" });

  useEffect(() => {
    const hash = window.location.hash;
    window.history.replaceState(null, "", window.location.pathname);
    let active = true;
    void setRecoverySession(getSupabaseClient(), hash).then(({ error }) => {
      if (active) setState(error ? { status: "invalid", message: error.message } : { status: "ready" });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
