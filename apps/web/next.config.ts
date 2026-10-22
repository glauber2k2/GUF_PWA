import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Versão do app (package.json), exibida no Perfil · "Sobre". */
const APP_VERSION = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string }).version;

const DEFAULT_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

/**
 * Site 100% estático (Cloudflare Pages): sem SSR com dados, Server Actions,
 * Route Handlers ou middleware. Tudo roda no cliente.
 *
 * Páginas só de desenvolvimento usam a extensão `.dev.tsx` (ex.: /design-system).
 * Elas só são reconhecidas no `next dev`; o build de produção nem gera a rota.
 */
export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    output: "export",
    env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
    trailingSlash: true,
    images: { unoptimized: true },
    pageExtensions: isDevServer
      ? ["dev.tsx", ...DEFAULT_PAGE_EXTENSIONS]
      : DEFAULT_PAGE_EXTENSIONS,
    transpilePackages: ["@guf/api", "@guf/core", "@guf/schemas", "@guf/types", "@guf/ui"],
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
