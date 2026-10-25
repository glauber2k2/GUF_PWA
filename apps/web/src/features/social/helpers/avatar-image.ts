import type { CropRect } from "@guf/core";

/** Lado da foto enviada: o maior avatar do app tem 124 px; 512 cobre telas de alta densidade. */
const AVATAR_SIDE_PX = 512;
const AVATAR_JPEG_QUALITY = 0.86;

/**
 * Recorta o pedaço escolhido (ou o centro, sem recorte), reduz para AVATAR_SIDE_PX e converte em JPEG no
 * aparelho. Sai sem metadados (o canvas não leva EXIF, como a localização da câmera) e bem abaixo do limite do bucket.
 * @param crop pedaço quadrado em px da imagem (`cropSourceRect` do editor); null = centro.
 * @throws quando o navegador não consegue abrir a imagem (formato não suportado).
 */
export async function toAvatarImage(file: Blob, crop: CropRect | null = null): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = crop?.size ?? Math.min(bitmap.width, bitmap.height);
    const sourceX = crop?.x ?? (bitmap.width - side) / 2;
    const sourceY = crop?.y ?? (bitmap.height - side) / 2;
    const target = Math.round(Math.min(AVATAR_SIDE_PX, side));
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas indisponível");
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, target, target);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("conversão falhou"))), "image/jpeg", AVATAR_JPEG_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}
