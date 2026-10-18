import type { Metadata } from "next";
import { LegalCentral } from "@/features/legal";

export const metadata: Metadata = {
  title: "Documentos legais · guf",
};

/** Central dos documentos legais (Perfil › Sobre); pública, sem login. */
export default function Page() {
  return <LegalCentral />;
}
