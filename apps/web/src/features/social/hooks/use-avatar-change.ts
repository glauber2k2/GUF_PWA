"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { apiError, type ApiError } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { useRemoveAvatar, useUploadAvatar } from "@/features/profile";
import { toAvatarImage } from "@/features/social/helpers/avatar-image";

/**
 * Trocar a foto do perfil: escolher (galeria ou câmera frontal), preparar no aparelho e enviar na hora
 * (a foto não espera o "Salvar"). `runWithRing` mostra o anel enchendo enquanto envia.
 */
export function useAvatarChange(runWithRing: <T>(task: () => Promise<T>) => Promise<T>) {
  const { showToast } = useAppShell();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  /** Foto mostrada logo depois da troca, enquanto o perfil recarrega (null = ainda não trocou nesta tela). */
  const [changed, setChanged] = useState<{ url: string | null; isUploaded: boolean } | null>(null);

  const showError = (error: ApiError) => showToast("Foto não alterada", { tone: "error", message: error.message });

  const pick = (source: "gallery" | "camera") => {
    const input = inputRef.current;
    if (!input) return;
    if (source === "camera") input.setAttribute("capture", "user");
    else input.removeAttribute("capture");
    input.click();
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa para que escolher a mesma foto de novo dispare outra troca.
    event.target.value = "";
    if (!file) return;
    let image: Blob;
    try {
      image = await toAvatarImage(file);
    } catch {
      return showError(apiError("avatar_upload_failed"));
    }
    try {
      setChanged({ url: await runWithRing(() => upload.mutateAsync(image)), isUploaded: true });
    } catch (e) {
      showError(e as ApiError);
    }
  };

  const removePhoto = async () => {
    try {
      setChanged({ url: await remove.mutateAsync(), isUploaded: false });
      showToast("Foto removida", { tone: "success" });
    } catch (e) {
      showError(e as ApiError);
    }
  };

  return { inputRef, pick, onFile, removePhoto, changed, isBusy: upload.isPending || remove.isPending };
}
