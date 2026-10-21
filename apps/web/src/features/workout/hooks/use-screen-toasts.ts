"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppShell, type ToastOptions } from "@/features/app-shell";

/** Avisos da tela; os que têm ação ("Desfazer") só valem nela e saem junto quando ela fecha. */
export function useScreenToasts(): (title: string, options?: ToastOptions) => number {
  const { showToast, dismissToast } = useAppShell();
  const actionToasts = useRef(new Set<number>());
  useEffect(() => {
    const ids = actionToasts.current;
    return () => ids.forEach((id) => dismissToast(id));
  }, [dismissToast]);
  return useCallback(
    (title: string, options: ToastOptions = {}) => {
      const id = showToast(title, options);
      if (options.onAction) actionToasts.current.add(id);
      return id;
    },
    [showToast],
  );
}
