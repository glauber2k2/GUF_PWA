import type { Metadata } from "next";
import { PasswordRecoveryScreen } from "@/features/auth";

export const metadata: Metadata = {
  title: "Recuperar acesso · Guf",
};

/** Fora do grupo (auth): quem está logado também chega aqui (atalho "Esqueci minha senha" de Alterar senha). */
export default function PasswordRecoveryPage() {
  return <PasswordRecoveryScreen />;
}
