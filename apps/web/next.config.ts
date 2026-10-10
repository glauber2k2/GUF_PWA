import type { NextConfig } from "next";

/**
 * Site 100% estático (Cloudflare Pages): sem SSR com dados, Server Actions,
 * Route Handlers ou middleware. Tudo roda no cliente.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@guf/api", "@guf/core", "@guf/schemas", "@guf/types"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
