"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@guf/api";
import { safeNextPath } from "@/features/auth/helpers/redirect";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** URL de retorno do Google: /login da origem atual, preservando o ?next= validado. */
export function googleRedirectUrl(origin: string, next: string | null): string {
  const safe = safeNextPath(next);
  return `${origin}/login${safe ? `?next=${encodeURIComponent(safe)}` : ""}`;
}

/**
 * "Continuar com Google" (OAuth com PKCE). Na volta para /login, o cliente troca o
 * ?code= pela sessão ao carregar a página e a tela segue para o next (ou /).
 * Se houver documentos pendentes, o guarda leva para /aceite antes de liberar o app.
 * Precisa de curinga nas Redirect URLs do Supabase (ex.: http://localhost:3000/**).
 */
export function useGoogleSignIn(onError: (message: string) => void) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const { data, error } = await signInWithGoogle(getSupabaseClient(), {
      redirectTo: googleRedirectUrl(window.location.origin, searchParams.get("next")),
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
