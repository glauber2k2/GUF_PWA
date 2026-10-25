"use client";

import { Banner } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useConsents } from "@/features/profile/api/use-profile";
import { AcceptedDocumentsSection } from "@/features/profile/components/accepted-documents-section";
import { LegalDocumentsSection } from "@/features/profile/components/legal-documents-section";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { SettingsHeader } from "@/features/profile/components/settings-header";
import { SETTINGS_PATH } from "@/features/profile/helpers/paths";

/** Configurações › Documentos: os documentos legais (central e leitor) e o que você aceitou. */
export function DocumentsSettingsScreen() {
  const goBack = useGoBack(SETTINGS_PATH);
  const consents = useConsents();

  return (
    <main className="flex flex-col px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <SettingsHeader title="Documentos" onBack={goBack} />
      <div className="flex flex-col gap-4 pt-2">
        <LegalDocumentsSection />
        {consents.isPending ? (
          <ProfileSkeleton />
        ) : consents.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void consents.refetch()}>
            Não foi possível carregar os documentos aceitos. Verifique a internet e tente de novo.
          </Banner>
        ) : (
          <AcceptedDocumentsSection consents={consents.data} />
        )}
      </div>
    </main>
  );
}
