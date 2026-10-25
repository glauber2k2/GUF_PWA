"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { Banner, IconButton } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useTour } from "@/features/onboarding";
import { useCanEditProfile, useProfile, useProfileSource } from "@/features/profile/api/use-profile";
import { useInstallPlatform } from "@/store/global/pwa.store";
import { AboutSection } from "@/features/profile/components/about-section";
import { InstallCard } from "@/features/profile/components/install-card";
import { PreferencesSection } from "@/features/profile/components/preferences-section";
import { SettingsHeader } from "@/features/profile/components/settings-header";
import { SettingsNavSection } from "@/features/profile/components/settings-nav-section";
import { LEGACY_PRIVACY_ANCHOR, PRIVACY_SETTINGS_PATH } from "@/features/profile/helpers/paths";
import { ProfileSignOut } from "@/features/profile/components/profile-sign-out";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { UserCard } from "@/features/profile/components/user-card";

interface SettingsScreenProps {
  plan?: ReactNode;
  /** Tela de Editar perfil (nome, @, foto, bio): o nome se edita só lá. */
  editProfileHref: string;
}

/**
 * Configurações (protótipo "Configurações"; abre pelo menu do Perfil): dados da conta, plano, instalar o
 * app, preferências, as subpáginas Privacidade e Documentos, sobre e sair.
 * Alterações só com internet; instalar, tema e sair funcionam sem conexão.
 */
export function SettingsScreen({ plan, editProfileHref }: SettingsScreenProps) {
  const router = useRouter();
  const goBack = useGoBack("/perfil");
  const tour = useTour();
  const { dev } = useProfileSource();
  const profile = useProfile();
  const canEdit = useCanEditProfile();
  const detected = useInstallPlatform();
  const platform = dev.platform ?? detected;
  const loading = dev.forceLoading || profile.isPending;

  // Endereço antigo da privacidade (documentos legais, apps instalados): agora é uma subpágina.
  useEffect(() => {
    if (window.location.hash === LEGACY_PRIVACY_ANCHOR) router.replace(PRIVACY_SETTINGS_PATH);
  }, [router]);

  // Aberto por um atalho (ex.: /configuracoes#pf-about): rola até a seção quando o conteúdo carrega.
  useEffect(() => {
    if (loading || !window.location.hash || window.location.hash === LEGACY_PRIVACY_ANCHOR) return;
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [loading]);

  return (
    <main className="flex flex-col px-4">
      <SettingsHeader title="Configurações" onBack={goBack} trailing={<IconButton icon={CircleHelp} label="Ver tutorial" variant="ghost" onClick={tour.start} />} />
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
            <UserCard profile={profile.data} editProfileHref={editProfileHref} />
            {plan}
            <InstallCard platform={platform} />
            <PreferencesSection profile={profile.data} canEdit={canEdit} platform={platform} />
            <SettingsNavSection />
            <AboutSection />
            <ProfileSignOut forcePending={dev.forcePending} />
          </>
        )}
      </div>
    </main>
  );
}
