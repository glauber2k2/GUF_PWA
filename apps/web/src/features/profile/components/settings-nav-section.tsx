"use client";

import { useRouter } from "next/navigation";
import { Scale, Shield, type LucideIcon } from "lucide-react";
import { DOCUMENTS_SETTINGS_PATH, PRIVACY_SETTINGS_PATH } from "@/features/profile/helpers/paths";
import { ProfileSection, RowButton, RowGroup } from "./profile-ui";

interface SettingsPage {
  path: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

/** Subpáginas das Configurações. Subpágina nova = item aqui + rota + tela. */
const SETTINGS_PAGES: readonly SettingsPage[] = [
  { path: PRIVACY_SETTINGS_PATH, icon: Shield, title: "Privacidade", subtitle: "Perfil social, seus dados, saúde e exclusão da conta" },
  { path: DOCUMENTS_SETTINGS_PATH, icon: Scale, title: "Documentos", subtitle: "Termos, Política de Privacidade e o que você aceitou" },
];

/** Entradas das subpáginas (cada assunto na própria tela, em vez de tudo numa lista longa). */
export function SettingsNavSection() {
  const router = useRouter();
  return (
    <ProfileSection id="pf-pages" title="Privacidade e documentos" className="[animation-delay:150ms]">
      {SETTINGS_PAGES.map((page, index) => (
        <RowGroup key={page.path} first={index === 0}>
          <RowButton icon={page.icon} title={page.title} subtitle={page.subtitle} onClick={() => router.push(page.path)} />
        </RowGroup>
      ))}
    </ProfileSection>
  );
}
