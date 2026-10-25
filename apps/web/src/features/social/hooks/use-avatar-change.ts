"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { apiError, type ApiError } from "@guf/api";
import type { CropRect } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useRemoveAvatar, useUploadAvatar } from "@/features/profile";
import { toAvatarImage } from "@/features/social/helpers/avatar-image";

/**
 * Trocar a foto do perfil: escolher (galeria ou câmera frontal), ajustar o recorte redondo
 * (`AvatarCropDialog` com `fileToCrop`), preparar no aparelho e enviar na hora (a foto não espera o
 * "Salvar"). `runWithRing` mostra o anel enchendo enquanto envia.
 */
export function useAvatarChange(runWithRing: <T>(task: () => Promise<T>) => Promise<T>) {
  const { showToast } = useAppShell();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  /** Foto mostrada logo depois da troca, enquanto o perfil recarrega (null = ainda não trocou nesta tela). */
  const [changed, setChanged] = useState<{ url: string | null; isUploaded: boolean } | null>(null);
  /** Foto escolhida esperando o ajuste do recorte, com o endereço local para mostrar (null = editor fechado). */
  const [fileToCrop, setFileToCrop] = useState<{ file: File; url: string } | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

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
    if (file) setFileToCrop({ file, url: URL.createObjectURL(file) });
  };

  const closeCrop = () => {
    if (fileToCrop) URL.revokeObjectURL(fileToCrop.url);
    setFileToCrop(null);
  };

  const confirmCrop = async (crop: CropRect) => {
    if (!fileToCrop) return;
    let image: Blob;
    setIsPreparing(true);
    try {
      image = await toAvatarImage(fileToCrop.file, crop);
    } catch {
      return showError(apiError("avatar_upload_failed"));
    } finally {
      setIsPreparing(false);
      closeCrop();
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

  return { inputRef, pick, onFile, cropSource: fileToCrop?.url ?? null, isPreparing, cancelCrop: closeCrop, confirmCrop, removePhoto, changed, isBusy: upload.isPending || remove.isPending };
}
