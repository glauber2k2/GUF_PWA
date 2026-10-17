import { domToBlob } from "modern-screenshot";

/*
 * Exportação dos stories: o elemento da arte (1080 × 1920) vira PNG no próprio aparelho
 * (modern-screenshot embute fontes e estilos; nada vai para servidor). Fundo transparente
 * quando a opacidade é 0.
 */

export class StoryExportError extends Error {
  constructor(
    message: string,
    readonly kind: "render" | "storage" | "share",
  ) {
    super(message);
  }
}

/** PNG da arte em tamanho real. */
export async function storyToPng(node: HTMLElement): Promise<Blob> {
  try {
    // Espera as fontes (Inter e Barlow) para o texto não sair na fonte padrão.
    await document.fonts.ready;
    const blob = await domToBlob(node, { width: 1080, height: 1920, scale: 1, type: "image/png" });
    if (!blob) throw new Error("vazio");
    return blob;
  } catch {
    throw new StoryExportError("Não foi possível gerar a imagem. Tente de novo.", "render");
  }
}

const file = (blob: Blob, name: string) => new File([blob], name, { type: "image/png" });

/** O navegador consegue compartilhar arquivos (folha nativa: Instagram, WhatsApp…)? */
export function canShareImages(): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file(new Blob(), "teste.png")] });
  } catch {
    return false;
  }
}

/** Abre a folha de compartilhar do sistema. false = a pessoa cancelou. */
export async function shareImage(blob: Blob, name: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file(blob, name)] });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    throw new StoryExportError("Não foi possível abrir o compartilhamento. Baixe a imagem e publique pelo app do Instagram.", "share");
  }
}

/** Baixa o PNG (vai para Downloads; no iPhone, abre a imagem para salvar em Fotos). */
export function downloadImage(blob: Blob, name: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    throw new StoryExportError("Imagem não salva. Libere espaço no aparelho e tente de novo.", "storage");
  }
}
