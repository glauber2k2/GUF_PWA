"use client";

import { useState } from "react";
import { HANDLE_MAX_LENGTH, isGeneratedHandle, normalizeHandle, suggestHandles } from "@guf/core";
import type { ApiError } from "@guf/api";
import { useUpdateProfile } from "@/features/profile";
import { useUpdateHandle } from "@/features/social/api/use-social";
import { useHandleAvailability } from "@/features/social/hooks/use-handle-availability";

/** Nome com no máximo este tamanho (o mesmo limite do Editar perfil). */
const NAME_MAX_LENGTH = 40;

/** generated = o @ aleatório do cadastro · same = o seu atual · os demais vêm da conferência do @. */
export type SetupHandleStatus = "generated" | "same" | "invalid" | "checking" | "available" | "taken" | "unknown";

export interface SetupIdentityInitial {
  userId: string;
  name: string;
  handle: string;
}

/** Só o que o @ aceita: minúsculas, números, ponto e _ (sem o "@" do começo). */
function toHandleInput(value: string): string {
  return normalizeHandle(value)
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, HANDLE_MAX_LENGTH);
}

/**
 * Passo "Nome e usuário": nome, @ com a conferência de disponibilidade, sugestões a partir do nome e
 * gravação (@ primeiro: em uso, nada mais grava e o passo mostra as opções livres).
 */
export function useSetupIdentity(initial: SetupIdentityInitial) {
  const updateProfile = useUpdateProfile();
  const updateHandle = useUpdateHandle();
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [saved, setSaved] = useState({ name: initial.name, handle: initial.handle });
  const [takenHandle, setTakenHandle] = useState<string | null>(null);
  const availability = useHandleAvailability(handle, saved.handle, initial.userId);

  const status: SetupHandleStatus =
    takenHandle === handle ? "taken" : availability === "same" ? (isGeneratedHandle(handle) ? "generated" : "same") : availability;
  const suggestions =
    status === "taken" ? suggestHandles(name, handle) : status === "generated" && name.trim() ? suggestHandles(name) : [];
  const isSaving = updateHandle.isPending || updateProfile.isPending;
  const canContinue = name.trim().length > 0 && ["generated", "same", "available", "unknown"].includes(status) && !isSaving;

  /** Grava o que mudou; false quando o @ estava em uso (o passo continua aberto com as opções). */
  const save = async (): Promise<boolean> => {
    const nextName = name.trim();
    try {
      if (handle !== saved.handle) await updateHandle.mutateAsync(handle);
      if (nextName !== saved.name) await updateProfile.mutateAsync({ name: nextName });
    } catch (e) {
      if ((e as ApiError).code !== "handle_taken") throw e;
      setTakenHandle(handle);
      return false;
    }
    setSaved({ name: nextName, handle });
    return true;
  };

  return {
    name,
    setName: (value: string) => setName(value.slice(0, NAME_MAX_LENGTH)),
    handle,
    /** @ gravado na conta (o digitado só vale depois de Continuar). */
    savedHandle: saved.handle,
    setHandle: (value: string) => setHandle(toHandleInput(value)),
    status,
    suggestions,
    canContinue,
    isSaving,
    save,
  };
}

export type SetupIdentity = ReturnType<typeof useSetupIdentity>;
