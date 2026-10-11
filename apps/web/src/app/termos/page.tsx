import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Termos de Uso · guf",
};

/** Documento legal (público, sem login; abre sem internet). */
export default function Page() {
  return <LegalDocumentPage doc="termos" />;
}
