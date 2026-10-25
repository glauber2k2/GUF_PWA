import { PrivacySettingsScreen } from "@/features/profile";
import { SocialPrivacyGroup } from "@/features/social";

/** Configurações › Privacidade; a privacidade do perfil social vem da feature dela. */
export default function PrivacidadePage() {
  return <PrivacySettingsScreen socialPrivacy={<SocialPrivacyGroup />} />;
}
