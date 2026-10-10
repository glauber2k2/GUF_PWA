import type { Metadata } from "next";
import { ConsentForm } from "@/components/auth/consent-form";

export const metadata: Metadata = {
  title: "Aceite dos termos · Guf",
};

/** Portão LGPD: aceite dos documentos obrigatórios pendentes. */
export default function ConsentPage() {
  return <ConsentForm />;
}
