import type { Metadata } from "next";
import { StoryGalleryScreen } from "@/features/share";

/**
 * Galeria dos PNGs exportáveis (stories, cartões, telas cheias, stickers) — SÓ EM DESENVOLVIMENTO.
 * A extensão .dev.tsx só é reconhecida pelo `next dev` (ver next.config.ts); o build de produção
 * não gera esta rota.
 */
export const metadata: Metadata = {
  title: "PNGs exportáveis · Guf",
  robots: { index: false, follow: false },
};

export default function PngsPage() {
  return <StoryGalleryScreen />;
}
