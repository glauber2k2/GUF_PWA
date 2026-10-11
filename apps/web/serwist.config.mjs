// @ts-check
/**
 * Service worker gerado DEPOIS do `next build` (site estático em out/): empacota sw/sw.ts com esbuild
 * e injeta o pré-cache dos arquivos exportados. Sem Route Handler nem servidor (CLAUDE.md).
 * @type {import("@serwist/cli").BuildOptions}
 */
const config = {
  swSrc: "sw/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: ["**/*.{html,txt,js,css,woff2,svg,png,ico,webmanifest,json}"],
  // O próprio service worker e mapas de código não entram no pré-cache.
  globIgnores: ["sw.js", "**/*.map"],
  // Arquivos de _next/static já têm hash no nome: não precisam de revisão extra.
  dontCacheBustURLsMatching: /^_next\/static\//,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
};

export default config;
