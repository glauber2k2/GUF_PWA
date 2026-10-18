import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade · guf",
};

/** Documento legal (público, sem login; abre sem internet). */
export default function Page() {
  return <LegalDocumentPage doc="privacidade" />;
}
