"use client";

import { useEffect, useState } from "react";
import { isValidHandle } from "@guf/core";
import { useSocialSource } from "@/features/social/api/use-social";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** same = o seu atual · invalid = fora da regra (o formulário mostra o erro) · unknown = não deu para conferir. */
export type HandleAvailability = "same" | "invalid" | "checking" | "available" | "taken" | "unknown";

/** Espera depois da última tecla antes de perguntar ao servidor. */
const CHECK_DELAY_MS = 650;

/**
 * Confere se o @ digitado está livre (pelo id do @: achou outra pessoa = em uso).
 * É só um aviso antecipado: quem garante é o banco ao salvar (handle_taken), inclusive para
 * pessoas bloqueadas, que a busca não mostra.
 */
export function useHandleAvailability(handle: string, savedHandle: string, myUserId: string | null): HandleAvailability {
  const { api } = useSocialSource();
  const [checked, setChecked] = useState<{ handle: string; status: HandleAvailability } | null>(null);
  const shouldCheck = handle !== savedHandle && isValidHandle(handle);

  useEffect(() => {
    if (!shouldCheck) return;
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      const { data, error } = await api.findByHandle(getSupabaseClient(), handle);
      if (!isCurrent) return;
      const status: HandleAvailability = error
        ? error.code === "person_not_found"
          ? "available"
          : "unknown"
        : data === myUserId
          ? "same"
          : "taken";
      setChecked({ handle, status });
    }, CHECK_DELAY_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [api, handle, myUserId, shouldCheck]);

  if (handle === savedHandle) return "same";
  if (!isValidHandle(handle)) return "invalid";
  return checked?.handle === handle ? checked.status : "checking";
}
