import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Criar senha nova · Guf",
};

/** Fora do grupo (auth): o link já abre a sessão, e o (auth) mandaria quem está logado para o app. */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
