"use client";

import { useCallback, useRef, useState } from "react";
import type { ApiError } from "@guf/api";

/**
 * Ações que compartilham dados (aceitar seguidor, abrir o perfil): se o servidor responder que falta
 * o consentimento, abre a folha e repete a ação depois de autorizar. Outros erros vão para onError.
 */
export function useSharingConsentGate(onError: (error: ApiError) => void) {
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => Promise<void>) | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      try {
        await action();
      } catch (e) {
        const error = e as ApiError;
        if (error.code === "social_consent_required") {
          pending.current = action;
          setOpen(true);
          return;
        }
        onError(error);
      }
    },
    [onError],
  );

  const onGranted = useCallback(() => {
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    if (action) void action().catch((e: unknown) => onError(e as ApiError));
  }, [onError]);

  const onClose = useCallback(() => {
    pending.current = null;
    setOpen(false);
  }, []);

  return { run, sheet: { open, onClose, onGranted } };
}
