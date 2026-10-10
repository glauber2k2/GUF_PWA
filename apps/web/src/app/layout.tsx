import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
  title: "Guf",
  description: "Registre seus treinos e acompanhe sua evolução.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
