import type { MetadataRoute } from "next";

// Gerado no build como arquivo estático (/manifest.webmanifest): site exportado, sem servidor.
export const dynamic = "force-static";

/** Cores do manifesto = token ink-950 (fundo do tema escuro, padrão do app); o manifesto não lê CSS. */
const INK = "#0B0D10";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "guf – evolução fitness",
    short_name: "guf",
    description: "Registre seus treinos e acompanhe sua evolução.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: INK,
    theme_color: INK,
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
