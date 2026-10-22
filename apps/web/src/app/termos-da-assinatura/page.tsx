import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "Termos da Assinatura · guf",
};

/** Documento legal (público, sem login; abre sem internet). Aceito só na tela de assinatura do Pro. */
export default function Page() {
  return <LegalDocumentPage doc="assinatura" />;
}
