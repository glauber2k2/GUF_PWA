import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "Termo de Consentimento para Dados de Saúde · guf",
};

/** Documento legal (público, sem login; abre sem internet). */
export default function Page() {
  return <LegalDocumentPage doc="saude" />;
}
