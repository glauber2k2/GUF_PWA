import type { Metadata } from "next";
import { ConsentPlaceholder } from "@/components/auth/consent-placeholder";

export const metadata: Metadata = {
  title: "Aceite dos termos · Guf",
};

/** MARCADOR: a tela de aceite real entra quando o design estiver pronto. */
export default function ConsentPage() {
  return <ConsentPlaceholder />;
}
