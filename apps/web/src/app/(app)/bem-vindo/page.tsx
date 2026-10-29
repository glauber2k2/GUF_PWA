import type { Metadata } from "next";
import { ProfileSetupScreen } from "@/features/social";

export const metadata: Metadata = {
  title: "Bem-vindo · Guf",
};

/** Cadastro em passos logo depois de criar a conta (nome e @, foto, amigos). */
export default function ProfileSetupPage() {
  return <ProfileSetupScreen />;
}
