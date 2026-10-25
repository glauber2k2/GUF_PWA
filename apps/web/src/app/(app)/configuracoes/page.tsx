import { PlanSettingsSection } from "@/features/plans";
import { SettingsScreen } from "@/features/profile";
import { editProfilePath } from "@/features/social";

/** Configurações (menu do Perfil); o plano e o Editar perfil vêm das features deles. */
export default function ConfiguracoesPage() {
  return <SettingsScreen plan={<PlanSettingsSection />} editProfileHref={editProfilePath()} />;
}
