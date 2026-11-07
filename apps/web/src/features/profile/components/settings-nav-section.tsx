"use client";

import { useRouter } from "next/navigation";
import { KeyRound, Scale, Shield, type LucideIcon } from "lucide-react";
import { DOCUMENTS_SETTINGS_PATH, PASSWORD_SETTINGS_PATH, PRIVACY_SETTINGS_PATH } from "@/features/profile/helpers/paths";
import { ProfileSection, RowButton, RowGroup } from "./profile-ui";

interface SettingsPage {
  path: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Só para quem entra com e-mail e senha (quem entra só com o Google não tem senha). */
  needsPasswordLogin?: boolean;
}

/** Subpáginas das Configurações. Subpágina nova = item aqui + rota + tela. */
const SETTINGS_PAGES: readonly SettingsPage[] = [
  { path: PASSWORD_SETTINGS_PATH, icon: KeyRound, title: "Alterar senha", subtitle: "Troque a senha e saia dos outros aparelhos", needsPasswordLogin: true },
  { path: PRIVACY_SETTINGS_PATH, icon: Shield, title: "Privacidade", subtitle: "Perfil social, seus dados, saúde e exclusão da conta" },
  { path: DOCUMENTS_SETTINGS_PATH, icon: Scale, title: "Documentos", subtitle: "Termos, Política de Privacidade e o que você aceitou" },
];

/** Entradas das subpáginas (cada assunto na própria tela, em vez de tudo numa lista longa). */
export function SettingsNavSection({ hasPasswordLogin }: { hasPasswordLogin: boolean }) {
  const router = useRouter();
  const pages = SETTINGS_PAGES.filter((page) => hasPasswordLogin || !page.needsPasswordLogin);
  return (
    <ProfileSection id="pf-pages" title="Segurança e privacidade" className="[animation-delay:150ms]">
      {pages.map((page, index) => (
        <RowGroup key={page.path} first={index === 0}>
          <RowButton icon={page.icon} title={page.title} subtitle={page.subtitle} onClick={() => router.push(page.path)} />
        </RowGroup>
      ))}
    </ProfileSection>
  );
}
