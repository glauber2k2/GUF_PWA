"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalizeHandle } from "@guf/core";
import { editSocialProfileSchema, type EditSocialProfileValues } from "@guf/schemas";
import { BottomSheet, Button, TextField } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useUpdateProfile } from "@/features/profile";
import { useCanUseSocial, useUpdateHandle } from "@/features/social/api/use-social";

/** Editar nome e @ (só online). O @ é único: em uso → mensagem no campo. */
export function EditProfileSheet({ open, onClose, name, handle }: { open: boolean; onClose: () => void; name: string | null; handle: string }) {
  const { showToast } = useAppShell();
  const canUse = useCanUseSocial();
  const updateProfile = useUpdateProfile();
  const updateHandle = useUpdateHandle();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<EditSocialProfileValues>({ resolver: zodResolver(editSocialProfileSchema), mode: "onChange", defaultValues: { name: "", handle: "" } });

  useEffect(() => {
    if (open) reset({ name: name ?? "", handle });
  }, [open, name, handle, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!canUse) return showToast("Sem conexão", { tone: "warning", message: "Para editar seu perfil, conecte-se à internet." });
    setSaving(true);
    try {
      const nextHandle = normalizeHandle(values.handle);
      if (nextHandle !== handle) await updateHandle.mutateAsync(nextHandle);
      if (values.name.trim() !== (name ?? "")) await updateProfile.mutateAsync({ name: values.name });
      showToast("Perfil atualizado", { tone: "success" });
      onClose();
    } catch (e) {
      const error = e as { code?: string; message: string };
      if (error.code === "handle_taken" || error.code === "handle_invalid") setError("handle", { message: error.message });
      else showToast(error.message, { tone: "error" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Editar perfil">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextField label="Nome" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Nome de usuário"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          hint="3 a 20 caracteres: letras minúsculas, números, ponto ou _"
          error={errors.handle?.message}
          {...register("handle")}
        />
        <Button type="submit" size="lg" fullWidth disabled={!isValid || saving} loading={saving}>
          Salvar
        </Button>
      </form>
    </BottomSheet>
  );
}
