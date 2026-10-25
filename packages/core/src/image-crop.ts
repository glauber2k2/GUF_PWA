/**
 * Recorte quadrado de uma imagem (foto do perfil): a imagem cobre a área de recorte, a pessoa
 * aproxima e arrasta, e a conta diz qual pedaço da imagem original vira a foto. Puro (sem DOM),
 * para o app web e o mobile usarem a mesma regra.
 */

export interface ImageSize {
  width: number;
  height: number;
}

/** Enquadramento: zoom (1 = a imagem só cobre a área) e deslocamento do centro, em px da tela. */
export interface CropView {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/** Pedaço quadrado da imagem original, em px da imagem. */
export interface CropRect {
  x: number;
  y: number;
  size: number;
}

export const CROP_MIN_ZOOM = 1;
export const CROP_MAX_ZOOM = 4;
export const INITIAL_CROP_VIEW: CropView = { zoom: CROP_MIN_ZOOM, offsetX: 0, offsetY: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Escala da imagem na tela para o zoom (px da tela por px da imagem). */
export function cropDisplayScale(image: ImageSize, viewportPx: number, zoom: number): number {
  return (viewportPx / Math.min(image.width, image.height)) * zoom;
}

/** Enquadramento válido: zoom dentro dos limites e sem deixar sobrar área vazia no recorte. */
export function clampCropView(image: ImageSize, viewportPx: number, view: CropView): CropView {
  const zoom = clamp(view.zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM);
  const scale = cropDisplayScale(image, viewportPx, zoom);
  const maxX = Math.max(0, (image.width * scale - viewportPx) / 2);
  const maxY = Math.max(0, (image.height * scale - viewportPx) / 2);
  return { zoom, offsetX: clamp(view.offsetX, -maxX, maxX), offsetY: clamp(view.offsetY, -maxY, maxY) };
}

/** Muda o zoom mantendo no centro o mesmo ponto da imagem. */
export function zoomCropView(image: ImageSize, viewportPx: number, view: CropView, nextZoom: number): CropView {
  const zoom = clamp(nextZoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM);
  const ratio = zoom / view.zoom;
  return clampCropView(image, viewportPx, { zoom, offsetX: view.offsetX * ratio, offsetY: view.offsetY * ratio });
}

/** Desloca o enquadramento (arrastar), sem deixar a imagem sair da área de recorte. */
export function panCropView(image: ImageSize, viewportPx: number, view: CropView, deltaX: number, deltaY: number): CropView {
  return clampCropView(image, viewportPx, { ...view, offsetX: view.offsetX + deltaX, offsetY: view.offsetY + deltaY });
}

/** Pedaço da imagem original que aparece na área de recorte. */
export function cropSourceRect(image: ImageSize, viewportPx: number, view: CropView): CropRect {
  const scale = cropDisplayScale(image, viewportPx, view.zoom);
  const size = Math.min(viewportPx / scale, image.width, image.height);
  const x = clamp(image.width / 2 - view.offsetX / scale - size / 2, 0, image.width - size);
  const y = clamp(image.height / 2 - view.offsetY / scale - size / 2, 0, image.height - size);
  return { x, y, size };
}
