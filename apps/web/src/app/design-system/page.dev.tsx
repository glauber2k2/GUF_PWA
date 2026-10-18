import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/features/design-system";

/**
 * Vitrine do design system — SÓ EM DESENVOLVIMENTO.
 * A extensão .dev.tsx só é reconhecida pelo `next dev` (ver next.config.ts);
 * o build de produção não gera esta rota.
 */
export const metadata: Metadata = {
  title: "Design system · Guf",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
