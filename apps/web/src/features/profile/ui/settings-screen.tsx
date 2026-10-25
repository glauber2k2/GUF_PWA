"use client";

import { useEffect, type ReactNode } from "react";
import { ChevronLeft, CircleHelp } from "lucide-react";
import { Banner, IconButton } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useTour } from "@/features/onboarding";
import { useCanEditProfile, useConsents, useProfile, useProfileSource } from "@/features/profile/api/use-profile";
import { useInstallPlatform } from "@/store/global/pwa.store";
import { AboutSection } from "@/features/profile/components/about-section";
import { InstallCard } from "@/features/profile/components/install-card";
import { PreferencesSection } from "@/features/profile/components/preferences-section";
import { PrivacySection } from "@/features/profile/components/privacy-section";
import { ProfileSignOut } from "@/features/profile/components/profile-sign-out";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { UserCard } from "@/features/profile/components/user-card";

/**
 * Configurações (protótipo "Configurações"; abre pelos três pontinhos do Perfil): dados da conta, plano,
 * instalar o app, preferências, privacidade (perfil social e LGPD), sobre e sair.
 * Alterações só com internet; instalar, tema e sair funcionam sem conexão.
 */
export function SettingsScreen({ socialPrivacy, plan }: { socialPrivacy?: ReactNode; plan?: ReactNode }) {
  const goBack = useGoBack("/perfil");
  const tour = useTour();
  const { dev } = useProfileSource();
  const profile = useProfile();
  const consents = useConsents();
  const canEdit = useCanEditProfile();
  const detected = useInstallPlatform();
  const platform = dev.platform ?? detected;
  const loading = dev.forceLoading || profile.isPending;

  // Aberto por um atalho (ex.: /configuracoes#pf-privacy, vindo de um documento legal): rola até a seção
  // quando o conteúdo carrega (antes disso só há o esqueleto).
  useEffect(() => {
    if (loading || !window.location.hash) return;
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [loading]);

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 flex-1 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">Configurações</h1>
        <IconButton icon={CircleHelp} label="Ver tutorial" variant="ghost" onClick={tour.start} />
      </div>
      <div className="flex flex-col gap-4 pt-2">
        {!canEdit && (
          <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
            para alterar seu perfil, conecte-se à internet.
          </Banner>
        )}

        {loading ? (
          <ProfileSkeleton />
        ) : profile.isError || !profile.data ? (
          <>
            <Banner tone="danger" actionLabel="Tentar" onAction={() => void profile.refetch()}>
              Não foi possível carregar seu perfil. Verifique a internet e tente de novo.
            </Banner>
            {/* Mesmo sem o perfil, dá para sair da conta. */}
            <ProfileSignOut forcePending={dev.forcePending} />
          </>
        ) : (
          <>
            <UserCard profile={profile.data} canEdit={canEdit} />
            {plan}
            <InstallCard platform={platform} />
            <PreferencesSection profile={profile.data} canEdit={canEdit} platform={platform} />
            <PrivacySection consents={consents.data} canEdit={canEdit} socialPrivacy={socialPrivacy} />
            <AboutSection />
            <ProfileSignOut forcePending={dev.forcePending} />
          </>
        )}
      </div>
    </main>
  );
}
