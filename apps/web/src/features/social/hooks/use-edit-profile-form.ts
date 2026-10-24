"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalizeHandle, toStoredBio, type ExperienceLevel, type TrainingGoal } from "@guf/core";
import { editSocialProfileSchema, type EditSocialProfileValues } from "@guf/schemas";
import type { ApiError, ProfileUpdate } from "@guf/api";
import { useUpdateProfile } from "@/features/profile";
import { useUpdateHandle } from "@/features/social/api/use-social";
import { useHandleAvailability } from "@/features/social/hooks/use-handle-availability";

export interface EditProfileInitial {
  userId: string | null;
  name: string;
  handle: string;
  bio: string;
  trainingGoals: TrainingGoal[];
  experienceLevel: ExperienceLevel | null;
}

function sameGoals(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((goal) => b.includes(goal));
}

/** Campos que mudaram em relação ao que está salvo (o @ vai por outra função do banco). */
function buildProfileChanges(values: EditSocialProfileValues, saved: EditProfileInitial): ProfileUpdate {
  return {
    ...(values.name.trim() !== saved.name && { name: values.name }),
    ...(toStoredBio(values.bio) !== toStoredBio(saved.bio) && { bio: values.bio }),
    ...(!sameGoals(values.trainingGoals, saved.trainingGoals) && { trainingGoals: values.trainingGoals }),
    ...(values.experienceLevel !== saved.experienceLevel && { experienceLevel: values.experienceLevel }),
  };
}

function countChanges(values: EditSocialProfileValues, saved: EditProfileInitial): number {
  const handleChanged = normalizeHandle(values.handle) !== saved.handle;
  return Object.keys(buildProfileChanges(values, saved)).length + (handleChanged ? 1 : 0);
}

/**
 * Formulário de "Editar perfil": valores, alterações pendentes, @ disponível e gravação
 * (@ primeiro: se estiver em uso, nada mais é gravado e o erro aparece no campo).
 */
export function useEditProfileForm(initial: EditProfileInitial) {
  const [saved, setSaved] = useState(initial);
  const updateProfile = useUpdateProfile();
  const updateHandle = useUpdateHandle();
  const form = useForm<EditSocialProfileValues>({
    resolver: zodResolver(editSocialProfileSchema),
    mode: "onChange",
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as EditSocialProfileValues;
  const handle = normalizeHandle(values.handle ?? "");
  const availability = useHandleAvailability(handle, saved.handle, initial.userId);
  const changes = countChanges(values, saved);
  const canSave = changes > 0 && form.formState.isValid && availability !== "checking" && availability !== "taken";

  const discard = () => form.reset(saved);

  /** Grava o que mudou; devolve false quando o erro já ficou no campo (@ em uso ou inválido). */
  const save = async (): Promise<boolean> => {
    const current = form.getValues();
    const nextHandle = normalizeHandle(current.handle);
    try {
      if (nextHandle !== saved.handle) await updateHandle.mutateAsync(nextHandle);
      const profileChanges = buildProfileChanges(current, saved);
      if (Object.keys(profileChanges).length > 0) await updateProfile.mutateAsync(profileChanges);
    } catch (e) {
      const error = e as ApiError;
      if (error.code !== "handle_taken" && error.code !== "handle_invalid") throw error;
      form.setError("handle", { message: error.message });
      return false;
    }
    const next: EditProfileInitial = {
      ...saved,
      name: current.name.trim(),
      handle: nextHandle,
      bio: toStoredBio(current.bio) ?? "",
      trainingGoals: current.trainingGoals,
      experienceLevel: current.experienceLevel,
    };
    setSaved(next);
    form.reset(next);
    return true;
  };

  return { form, values, availability, changes, canSave, discard, save };
}
