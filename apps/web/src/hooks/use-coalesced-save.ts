"use client";

import { useCallback, useEffect, useRef } from "react";
import { createCoalescedSaver, type CoalescedSaver } from "@guf/core";

/**
 * Agrupa toques rápidos em uma única gravação (ver createCoalescedSaver em @guf/core).
 * `save` e `skip` podem mudar a cada renderização: sempre vale a versão mais recente.
 * Ao sair da tela, o que estiver esperando é enviado na hora.
 */
export function useCoalescedSave<T>(save: (value: T) => Promise<void>, skip?: (value: T) => boolean, delayMs?: number) {
  const saveRef = useRef(save);
  const skipRef = useRef(skip);
  const saverRef = useRef<CoalescedSaver<T> | null>(null);
  useEffect(() => {
    saveRef.current = save;
    skipRef.current = skip;
  });

  useEffect(
    () => () => {
      void saverRef.current?.flush();
    },
    [],
  );

  // Criado no primeiro toque (fora da renderização) e reaproveitado depois.
  return useCallback(
    (value: T) => {
      saverRef.current ??= createCoalescedSaver<T>({
        save: (v) => saveRef.current(v),
        skip: (v) => skipRef.current?.(v) ?? false,
        delayMs,
      });
      saverRef.current.schedule(value);
    },
    [delayMs],
  );
}
