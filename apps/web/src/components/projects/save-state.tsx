"use client";

import { useCallback, useState } from "react";
import { apiError, type ApiError } from "@guf/api";
import { OFFLINE_EDIT_MESSAGE } from "@guf/core";
import { Banner } from "@/components/ds";
import { useCanEditPlanning } from "@/hooks/use-projects";

/**
 * Erro ao salvar um formulário de Projetos/Rotinas. A folha continua aberta com o que foi digitado:
 * sem internet → aviso de edição só online com "Tentar de novo"; outros erros → mensagem pronta da API.
 */
export function useSaveState() {
  const canEdit = useCanEditPlanning();
  const [error, setError] = useState<ApiError | null>(null);
  const reset = useCallback(() => setError(null), []);
  return {
    error,
    reset,
    fail: (next: ApiError) => setError(next),
    /** false (e mostra o aviso) quando não há internet para salvar. */
    ensureOnline: () => {
      if (canEdit) return true;
      setError(apiError("network_error"));
      return false;
    },
  };
}

export type SaveState = ReturnType<typeof useSaveState>;

export function SaveErrorBanner({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (!state.error) return null;
  if (state.error.code === "network_error") {
    return (
      <Banner tone="warning" title="Sem conexão" actionLabel="Tentar de novo" onAction={onRetry}>
        {OFFLINE_EDIT_MESSAGE} O que você digitou continua aqui.
      </Banner>
    );
  }
  return <Banner tone="danger">{state.error.message}</Banner>;
}
