import { AVATAR_FORMATS, AVATAR_MAX_BYTES, AVATAR_QUALITY_STEPS, AVATAR_SIDE_PX, type AvatarFormat, type CropRect } from "@guf/core";

/** Desenha o pedaço escolhido (ou o centro) num quadrado de até AVATAR_SIDE_PX. */
function drawAvatar(bitmap: ImageBitmap, crop: CropRect | null): HTMLCanvasElement {
  const side = crop?.size ?? Math.min(bitmap.width, bitmap.height);
  const sourceX = crop?.x ?? (bitmap.width - side) / 2;
  const sourceY = crop?.y ?? (bitmap.height - side) / 2;
  const target = Math.round(Math.min(AVATAR_SIDE_PX, side));
  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas indisponível");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, target, target);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, format: AvatarFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("conversão falhou"))), format, quality));
}

/**
 * Primeiro formato que o navegador sabe codificar: quem não codifica WebP (ex.: Safari no iPhone)
 * devolve PNG, então o tipo do resultado é conferido.
 */
async function pickFormat(canvas: HTMLCanvasElement): Promise<AvatarFormat> {
  for (const format of AVATAR_FORMATS) {
    const probe = await encode(canvas, format, AVATAR_QUALITY_STEPS[0]);
    if (probe.type === format) return format;
  }
  return "image/jpeg";
}

/** Desce a qualidade em degraus até caber em AVATAR_MAX_BYTES (a menor qualidade vale mesmo se passar). */
async function encodeWithinBudget(canvas: HTMLCanvasElement, format: AvatarFormat): Promise<Blob> {
  let blob: Blob | null = null;
  for (const quality of AVATAR_QUALITY_STEPS) {
    blob = await encode(canvas, format, quality);
    if (blob.size <= AVATAR_MAX_BYTES) return blob;
  }
  if (!blob) throw new Error("conversão falhou");
  return blob;
}

/**
 * Foto do perfil pronta para enviar: recorta o pedaço escolhido (ou o centro), reduz para AVATAR_SIDE_PX
 * e comprime no aparelho (WebP quando dá, senão JPEG, até AVATAR_MAX_BYTES). Sai sem metadados (o canvas
 * não leva EXIF, como a localização da câmera).
 * @param crop pedaço quadrado em px da imagem (`cropSourceRect` do editor); null = centro.
 * @throws quando o navegador não consegue abrir a imagem (formato não suportado).
 */
export async function toAvatarImage(file: Blob, crop: CropRect | null = null): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = drawAvatar(bitmap, crop);
    return await encodeWithinBudget(canvas, await pickFormat(canvas));
  } finally {
    bitmap.close();
  }
}
