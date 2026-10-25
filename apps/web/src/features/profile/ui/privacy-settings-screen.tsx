"use client";

import type { ReactNode } from "react";
import { Banner } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useCanEditProfile, useConsents } from "@/features/profile/api/use-profile";
import { PrivacySection } from "@/features/profile/components/privacy-section";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { SettingsHeader } from "@/features/profile/components/settings-header";
import { SETTINGS_PATH } from "@/features/profile/helpers/paths";

/**
 * Configurações › Privacidade: perfil social (vindo da rota), seus dados (exportar e outros pedidos),
 * dados de saúde e excluir a conta. Alterações só com internet.
 */
export function PrivacySettingsScreen({ socialPrivacy }: { socialPrivacy?: ReactNode }) {
  const goBack = useGoBack(SETTINGS_PATH);
  const consents = useConsents();
  const canEdit = useCanEditProfile();

  return (
    <main className="flex flex-col px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <SettingsHeader title="Privacidade" onBack={goBack} />
      <div className="flex flex-col gap-4 pt-2">
        {!canEdit && (
          <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
            para alterar sua privacidade, conecte-se à internet.
          </Banner>
        )}
        {consents.isPending ? <ProfileSkeleton /> : <PrivacySection consents={consents.data} canEdit={canEdit} socialPrivacy={socialPrivacy} />}
      </div>
    </main>
  );
}
