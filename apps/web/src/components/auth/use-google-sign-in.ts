"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
// Trocar por "@guf/api" na integração com o Supabase (mesma assinatura).
import { signInWithGoogle } from "@/mocks/auth";

/**
 * Inicia o "Continuar com Google". Após o primeiro acesso, o app checa
 * pending_documents() e manda para /aceite (próxima etapa).
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
