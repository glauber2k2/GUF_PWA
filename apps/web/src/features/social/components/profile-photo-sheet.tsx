"use client";

import { Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { BottomSheet, SheetOption } from "@/shared/components/ds";

export interface ProfilePhotoSheetProps {
  open: boolean;
  /** Só a foto enviada pode ser removida (a da conta Google volta sozinha). */
  canRemove: boolean;
  onClose: () => void;
  onPick: (source: "gallery" | "camera") => void;
  onRemove: () => void;
}

/** Folha "Foto de perfil": galeria, câmera frontal e remover a foto enviada. */
export function ProfilePhotoSheet({ open, canRemove, onClose, onPick, onRemove }: ProfilePhotoSheetProps) {
  const choose = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Foto de perfil">
      <div className="flex flex-col gap-2">
        <SheetOption icon={ImageIcon} title="Escolher da galeria" subtitle="JPG ou PNG; você ajusta o recorte em seguida" onClick={choose(() => onPick("gallery"))} />
        <SheetOption icon={Camera} title="Tirar foto" subtitle="Usa a câmera frontal" onClick={choose(() => onPick("camera"))} />
        {canRemove && (
          <SheetOption icon={Trash2} title="Remover foto" subtitle="Volta para a foto da conta Google ou para a sua inicial" onClick={choose(onRemove)} />
        )}
      </div>
    </BottomSheet>
  );
}
