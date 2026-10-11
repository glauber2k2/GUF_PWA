import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerUpdater } from "@/components/pwa/service-worker-updater";
import { THEME_BOOT_SCRIPT } from "@/lib/theme/theme";
import { Providers } from "@/providers/providers";
import "./globals.css";

// Fontes do design system (subset latin: cobre todo o português). Arquivos em ./fonts.
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
  title: "guf",
  applicationName: "guf",
  description: "Registre seus treinos e acompanhe sua evolução.",
  // Instalado no iPhone: tela cheia, sem barra do Safari. Ícones por arquivo: app/icon.svg e app/apple-icon.png.
  appleWebApp: { capable: true, title: "guf", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Barra do sistema na cor do fundo do app (token ink-950, tema escuro padrão).
  themeColor: "#0B0D10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
      // data-theme é aplicado pelo script abaixo antes da hidratação (preferência do aparelho).
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerUpdater />
      </body>
    </html>
  );
}
