"use client";

import { useId, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { CROP_MAX_ZOOM, CROP_MIN_ZOOM, cropDisplayScale, cropSourceRect, type CropRect, type CropView, type ImageSize } from "@guf/core";
import { Button, Icon, ScreenPortal } from "@/shared/components/ds";
import { useAvatarCrop } from "@/features/social/hooks/use-avatar-crop";

/** Lado máximo da área de recorte (cabe no celular com as margens). */
const MAX_VIEWPORT_PX = 320;
/** Prévias "Como vai ficar": a foto grande do perfil e a pequena das listas. */
const PREVIEW_SIZES_PX = [72, 40] as const;
const ZOOM_STEP = 0.01;

export interface AvatarCropDialogProps {
  /** Endereço local da foto escolhida (object URL). */
  src: string;
  /** Envio em andamento: os botões ficam esperando. */
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (crop: CropRect) => void;
}

/** Imagem posicionada pelo enquadramento (tamanho e deslocamento mudam a cada gesto: valores dinâmicos). */
function CroppedImage({ src, image, view, viewportPx }: { src: string; image: ImageSize; view: CropView; viewportPx: number }) {
  const scale = cropDisplayScale(image, viewportPx, view.zoom);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagem local (object URL) recém-escolhida; o next/image não se aplica
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
      style={{
        width: image.width * scale,
        height: image.height * scale,
        transform: `translate(calc(-50% + ${view.offsetX}px), calc(-50% + ${view.offsetY}px))`,
      }}
    />
  );
}

/** A mesma foto em miniatura redonda, como aparece no perfil. */
function CropPreview({ src, image, view, viewportPx, sizePx }: { src: string; image: ImageSize; view: CropView; viewportPx: number; sizePx: number }) {
  const ratio = sizePx / viewportPx;
  const scaled = { zoom: view.zoom, offsetX: view.offsetX * ratio, offsetY: view.offsetY * ratio };
  return (
    <span className="relative flex-none overflow-hidden rounded-pill border border-border bg-surface-3" style={{ width: sizePx, height: sizePx }}>
      <CroppedImage src={src} image={image} view={scaled} viewportPx={sizePx} />
    </span>
  );
}

/**
 * Editor da foto do perfil: arrastar e aproximar dentro do círculo, com a prévia redonda de como fica.
 * Devolve o pedaço da imagem original (px da imagem); a conversão e o envio ficam com quem abriu.
 */
export function AvatarCropDialog({ src, isSaving, onCancel, onConfirm }: AvatarCropDialogProps) {
  const maskId = useId();
  const [image, setImage] = useState<ImageSize | null>(null);
  const [viewportPx, setViewportPx] = useState(MAX_VIEWPORT_PX);
  const { view, setZoom, gestures } = useAvatarCrop(image, viewportPx);

  // Área de recorte quadrada do tamanho que couber na largura (até MAX_VIEWPORT_PX).
  const measureArea = (area: HTMLDivElement | null) => {
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => entry && setViewportPx(Math.min(MAX_VIEWPORT_PX, Math.floor(entry.contentRect.width))));
    observer.observe(area);
    return () => observer.disconnect();
  };

  return (
    <ScreenPortal>
      <div role="dialog" aria-modal="true" aria-labelledby={`${maskId}-title`} className="fixed inset-0 z-[70] flex flex-col bg-background">
        <header className="mx-auto flex w-full max-w-[430px] flex-col gap-1 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
          <h2 id={`${maskId}-title`} className="m-0 text-xl leading-7 font-bold">
            Ajustar foto
          </h2>
          <p className="m-0 text-sm leading-5 text-fg-secondary">Arraste para posicionar e aproxime com dois dedos ou pelo controle.</p>
        </header>

        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-6">
          <div ref={measureArea} className="w-full max-w-[320px]">
            <div
              {...gestures}
              aria-label="Área de recorte da foto"
              className="relative mx-auto touch-none overflow-hidden rounded-lg bg-surface-3"
              style={{ width: viewportPx, height: viewportPx }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- só para ler o tamanho real da imagem escolhida */}
              <img src={src} alt="" className="hidden" onLoad={(event) => setImage({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
              {image && <CroppedImage src={src} image={image} view={view} viewportPx={viewportPx} />}
              {/* Fora do círculo escurece: é o que fica de fora da foto redonda do perfil. */}
              <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
                <defs>
                  <mask id={maskId}>
                    <rect width="100%" height="100%" fill="white" />
                    <circle cx="50%" cy="50%" r="50%" fill="black" />
                  </mask>
                </defs>
                <rect width="100%" height="100%" mask={`url(#${maskId})`} className="fill-scrim" />
                <circle cx="50%" cy="50%" r="50%" fill="none" strokeWidth={2} className="stroke-accent" />
              </svg>
            </div>
          </div>

          <label className="flex w-full max-w-[320px] items-center gap-3">
            <span className="sr-only">Zoom</span>
            <Icon icon={ZoomOut} size={18} className="text-fg-muted" />
            <input
              type="range"
              min={CROP_MIN_ZOOM}
              max={CROP_MAX_ZOOM}
              step={ZOOM_STEP}
              value={view.zoom}
              disabled={!image}
              aria-valuetext={`${Math.round(view.zoom * 100)}%`}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-accent"
            />
            <Icon icon={ZoomIn} size={18} className="text-fg-muted" />
          </label>

          {image && (
            <div className="flex w-full max-w-[320px] items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
              <span className="flex-1 text-sm leading-5 font-semibold">Como vai ficar</span>
              {PREVIEW_SIZES_PX.map((size) => (
                <CropPreview key={size} src={src} image={image} view={view} viewportPx={viewportPx} sizePx={size} />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-border">
          <div className="mx-auto grid max-w-[430px] grid-cols-2 gap-3 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <Button variant="outline" size="lg" disabled={isSaving} onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="lg" loading={isSaving} disabled={!image} onClick={() => image && onConfirm(cropSourceRect(image, viewportPx, view))}>
              Usar foto
            </Button>
          </div>
        </footer>
      </div>
    </ScreenPortal>
  );
}
