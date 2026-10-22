import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});

const barlowCondensed = localFont({
  src: [
    { path: "./fonts/BarlowCondensed-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BarlowCondensed-600-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/BarlowCondensed-700-latin.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "guf admin",
  description: "Painel interno da equipe do guf.",
  // Painel interno: fora dos buscadores (também em robots.txt e no cabeçalho X-Robots-Tag).
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0D10",
};

/** Tema do sistema antes da pintura (escuro é o padrão do guf). */
const THEME_BOOT_SCRIPT = `(function(){try{if(window.matchMedia("(prefers-color-scheme: light)").matches)document.documentElement.setAttribute("data-theme","light")}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
