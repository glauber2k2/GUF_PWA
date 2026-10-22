import { PlanSettingsSection } from "@/features/plans";
import { SettingsScreen } from "@/features/profile";
import { SocialPrivacyGroup } from "@/features/social";

/** Configurações (três pontinhos do Perfil); o plano e a privacidade do perfil social vêm das features deles. */
export default function ConfiguracoesPage() {
  return <SettingsScreen plan={<PlanSettingsSection />} socialPrivacy={<SocialPrivacyGroup />} />;
}
