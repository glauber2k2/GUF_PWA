"use client";

import { useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { INITIAL_CROP_VIEW, panCropView, zoomCropView, type CropView, type ImageSize } from "@guf/core";

/** Quanto a roda do mouse aproxima por "clique" (fração do zoom atual). */
const WHEEL_ZOOM_STEP = 0.0015;

interface PointerPosition {
  x: number;
  y: number;
}

const distanceBetween = (a: PointerPosition, b: PointerPosition) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Gestos do recorte da foto: arrastar com um dedo (ou mouse), pinçar com dois e a roda do mouse.
 * A conta (limites, zoom pelo centro) fica em packages/core/src/image-crop.ts; aqui só os eventos.
 * @param image tamanho real da imagem; null enquanto carrega.
 * @param viewportPx lado da área de recorte na tela.
 */
export function useAvatarCrop(image: ImageSize | null, viewportPx: number) {
  const [view, setView] = useState<CropView>(INITIAL_CROP_VIEW);
  const pointers = useRef(new Map<number, PointerPosition>());
  const pinchDistance = useRef<number | null>(null);

  const setZoom = (zoom: number) => {
    if (image) setView((current) => zoomCropView(image, viewportPx, current, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...pointers.current.values()];
    pinchDistance.current = first && second ? distanceBetween(first, second) : null;
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!image || !previous) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    const [first, second] = [...pointers.current.values()];
    if (first && second && pinchDistance.current) {
      const distance = distanceBetween(first, second);
      const ratio = distance / pinchDistance.current;
      pinchDistance.current = distance;
      setView((current) => zoomCropView(image, viewportPx, current, current.zoom * ratio));
      return;
    }
    setView((current) => panCropView(image, viewportPx, current, next.x - previous.x, next.y - previous.y));
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = null;
  };

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    if (!image) return;
    setView((current) => zoomCropView(image, viewportPx, current, current.zoom * (1 - event.deltaY * WHEEL_ZOOM_STEP)));
  };

  return {
    view,
    setZoom,
    gestures: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onWheel },
  };
}
