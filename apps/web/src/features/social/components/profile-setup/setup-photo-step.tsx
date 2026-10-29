import { Camera, Image as ImageIcon, Pencil } from "lucide-react";
import { Button, Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { AvatarCropDialog } from "@/features/social/components/avatar-crop-dialog";
import type { useAvatarChange } from "@/features/social/hooks/use-avatar-change";
import { SetupPortrait } from "./setup-portrait";
import { SetupStepTitle } from "./setup-step-title";

/** Partes de useAvatarChange que o passo usa (separadas: o objeto do hook traz um ref). */
export type SetupPhotoControls = Pick<ReturnType<typeof useAvatarChange>, "inputRef" | "pick" | "onFile" | "cropSource" | "isPreparing" | "cancelCrop" | "confirmCrop" | "isBusy">;

/** Passo 2 · foto (protótipo 1c): tocar no círculo, Galeria ou Câmera; recorte e envio na hora. */
export function SetupPhotoStep({
  inputRef,
  pick,
  onFile,
  cropSource,
  isPreparing,
  cancelCrop,
  confirmCrop,
  isBusy,
  photoUrl,
  initial,
}: SetupPhotoControls & { photoUrl: string | null; initial: string }) {
  const hasPhoto = Boolean(photoUrl);
  return (
    <div className="flex flex-col gap-8">
      <SetupStepTitle title="Coloque uma foto" subtitle="Assim seus amigos te reconhecem no ranking e nos treinos compartilhados." />
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => pick("gallery")}
          disabled={isBusy}
          aria-label={hasPhoto ? "Trocar foto de perfil" : "Escolher foto de perfil"}
          className="relative size-44 cursor-pointer rounded-pill bg-transparent p-0 active:scale-97"
        >
          <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute -inset-3 size-[calc(100%+24px)] overflow-visible">
            <circle
              cx="24"
              cy="24"
              r="22.5"
              fill="none"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray={hasPhoto ? undefined : "2 2.4"}
              className={cn("transition-[stroke] duration-300 ease-standard", hasPhoto ? "stroke-accent" : "stroke-border-strong")}
            />
          </svg>
          <SetupPortrait photoUrl={photoUrl} initial={initial} />
          <span className="absolute right-1.5 bottom-1.5 grid size-11 place-items-center rounded-pill border-4 border-background bg-accent text-accent-foreground">
            <Icon icon={hasPhoto ? Pencil : Camera} size={18} />
          </span>
        </button>
        <span className="text-[13px] leading-[18px] text-fg-muted">{hasPhoto ? "Toque na foto para trocar" : "Sem foto, mostramos sua inicial"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="tall" icon={ImageIcon} fullWidth disabled={isBusy} onClick={() => pick("gallery")}>
          Galeria
        </Button>
        <Button variant="secondary" size="tall" icon={Camera} fullWidth disabled={isBusy} onClick={() => pick("camera")}>
          Câmera
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => void onFile(e)} className="hidden" />
      {cropSource && (
        <AvatarCropDialog src={cropSource} isSaving={isPreparing} onCancel={cancelCrop} onConfirm={(crop) => void confirmCrop(crop)} />
      )}
    </div>
  );
}
