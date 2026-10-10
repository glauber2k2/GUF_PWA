"use client";

import { useState } from "react";
import { signInWithGoogle } from "@guf/api";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Inicia o "Continuar com Google" (PKCE). Na volta, o cliente troca o ?code= pela sessão
 * ao carregar a página; o guarda checa pending_documents() e manda para /aceite se preciso.
 */
export function useGoogleSignIn(onError: (message: string) => void) {
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const { data, error } = await signInWithGoogle(getSupabaseClient(), {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) {
      setPending(false);
      onError(error.message);
      return;
    }
    window.location.assign(data.url);
  }

  return { start, pending };
}
