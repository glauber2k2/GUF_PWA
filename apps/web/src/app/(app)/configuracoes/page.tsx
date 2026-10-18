import { SettingsScreen } from "@/features/profile";
import { SocialPrivacyGroup } from "@/features/social";

/** Configurações (três pontinhos do Perfil); a privacidade do perfil social vem da feature social. */
export default function ConfiguracoesPage() {
  return <SettingsScreen socialPrivacy={<SocialPrivacyGroup />} />;
}
