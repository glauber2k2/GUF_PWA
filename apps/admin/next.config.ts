import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const DEFAULT_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

/**
 * Painel de administração do guf: site 100% estático, como o app (sem SSR, Server Actions, Route
 * Handlers ou middleware). Quem protege os dados é o banco (funções admin_* com papel e segundo fator).
 * Publicado em outro domínio, separado do app (docs/admin-panel.md §1.1).
 */
export default function config(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    pageExtensions: isDevServer ? ["dev.tsx", ...DEFAULT_PAGE_EXTENSIONS] : DEFAULT_PAGE_EXTENSIONS,
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
