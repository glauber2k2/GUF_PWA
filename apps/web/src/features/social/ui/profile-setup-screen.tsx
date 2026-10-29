"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, Dumbbell, Image as ImageIcon } from "lucide-react";
import type { ApiError } from "@guf/api";
import { Banner, Button, Skeleton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { useAppShell } from "@/features/app-shell";
import { useCompleteProfileSetup } from "@/features/onboarding";
import { useProfile } from "@/features/profile";
import { useMySocial } from "@/features/social/api/use-social";
import { useAvatarChange } from "@/features/social/hooks/use-avatar-change";
import { PROFILE_SETUP_COUNTED_STEPS, useProfileSetupSteps, type ProfileSetupStep } from "@/features/social/hooks/use-profile-setup-steps";
import { useSetupIdentity, type SetupIdentity, type SetupIdentityInitial } from "@/features/social/hooks/use-setup-identity";
import { SetupTopBar } from "@/features/social/components/profile-setup/setup-top-bar";
import { SetupIdentityStep } from "@/features/social/components/profile-setup/setup-identity-step";
import { SetupPhotoStep, type SetupPhotoControls } from "@/features/social/components/profile-setup/setup-photo-step";
import { SetupFriendsStep } from "@/features/social/components/profile-setup/setup-friends-step";
import { SetupDoneStep, type SetupSummaryItem } from "@/features/social/components/profile-setup/setup-done-step";

interface StepAction {
  label: string;
  icon: LucideIcon;
  isDisabled?: boolean;
  note?: string;
}

/**
 * Cadastro em passos logo depois de criar a conta (Claude Design "Cadastro Passo a Passo" + "Onboarding"):
 * nome e @, foto e amigos, todos com "Pular", e o resumo "Tudo pronto". Concluir grava na conta
 * (profiles.profile_setup_completed_at) e leva à Início, onde o tutorial começa.
 */
export function ProfileSetupScreen() {
  const profile = useProfile();
  const social = useMySocial();

  if (profile.isPending || social.isPending) {
    return (
      <main className="flex min-h-dvh flex-col gap-6 px-5 pt-[calc(72px+env(safe-area-inset-top))]" aria-busy="true">
        <Skeleton className="h-9 w-3/4 rounded-md" />
        <Skeleton className="h-[76px] w-full rounded-md" />
        <Skeleton className="h-[76px] w-full rounded-md" />
      </main>
    );
  }
  if (!profile.data || !social.data) {
    const error = (profile.error ?? social.error) as ApiError | null;
    return (
      <main className="flex min-h-dvh flex-col justify-center px-5">
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void Promise.all([profile.refetch(), social.refetch()])}>
          {error?.message ?? "Não foi possível carregar sua conta. Verifique a internet e tente de novo."}
        </Banner>
      </main>
    );
  }
  return (
    <ProfileSetupFlow
      initial={{ userId: social.data.userId, name: profile.data.name ?? "", handle: social.data.handle }}
      avatarUrl={profile.data.avatarUrl}
      followingCount={social.data.followingCount}
    />
  );
}

function ProfileSetupFlow({ initial, avatarUrl, followingCount }: { initial: SetupIdentityInitial; avatarUrl: string | null; followingCount: number }) {
  const router = useRouter();
  const { showToast } = useAppShell();
  const steps = useProfileSetupSteps();
  const identity = useSetupIdentity(initial);
  // Desestruturado: o objeto do hook traz um ref, e ler campos dele na renderização é proibido.
  const { inputRef, pick, onFile, cropSource, isPreparing, cancelCrop, confirmCrop, isBusy, changed } = useAvatarChange((task) => task());
  const photoControls: SetupPhotoControls = { inputRef, pick, onFile, cropSource, isPreparing, cancelCrop, confirmCrop, isBusy };
  const complete = useCompleteProfileSetup();
  const photoUrl = changed ? changed.url : avatarUrl;
  const firstName = identity.name.trim().split(/\s+/)[0] ?? "";
  const initialLetter = (firstName[0] ?? identity.handle[0] ?? "G").toUpperCase();

  const saveIdentityAndContinue = async () => {
    try {
      if (await identity.save()) steps.next();
    } catch (e) {
      showToast("Não foi possível salvar", { tone: "error", message: (e as ApiError).message });
    }
  };
  const finish = () => {
    complete.mutate();
    router.replace("/");
  };

  const actions: Record<ProfileSetupStep, StepAction & { run: () => void }> = {
    identity: {
      label: "Continuar",
      icon: ArrowRight,
      isDisabled: !identity.canContinue,
      note: !identity.name.trim() ? "Preencha seu nome para continuar" : identity.status === "checking" ? "Verificando…" : undefined,
      run: () => void saveIdentityAndContinue(),
    },
    photo: photoUrl
      ? { label: "Continuar", icon: ArrowRight, run: steps.next }
      : { label: "Escolher foto", icon: ImageIcon, note: "JPG ou PNG · quadrada fica melhor", run: () => pick("gallery") },
    friends: { label: followingCount > 0 ? `Concluir · seguindo ${followingCount}` : "Concluir", icon: Check, run: steps.next },
    done: { label: "Começar a treinar", icon: Dumbbell, run: finish },
  };
  const action = actions[steps.step];

  const summary: SetupSummaryItem[] = [
    { key: "identity", label: identity.name.trim() || "Nome", isDone: Boolean(identity.name.trim()) && !steps.skipped.has("identity") },
    { key: "photo", label: "Foto de perfil", isDone: Boolean(photoUrl) },
    { key: "friends", label: followingCount > 0 ? `Seguindo ${followingCount} ${followingCount === 1 ? "pessoa" : "pessoas"}` : "Amigos", isDone: followingCount > 0 },
  ];

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-fg">
      {steps.step !== "done" && (
        <SetupTopBar current={steps.index} total={PROFILE_SETUP_COUNTED_STEPS} canGoBack={steps.canGoBack} onBack={steps.back} onSkip={steps.skip} />
      )}
      <div
        key={steps.step}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-5 pt-7 pb-4",
          steps.step === "done" ? "animate-guf-rise" : steps.direction === "forward" ? "animate-guf-from-right" : "animate-guf-from-left",
        )}
      >
        <StepContent step={steps.step} identity={identity} photo={photoControls} photoUrl={photoUrl} initialLetter={initialLetter} firstName={firstName} summary={summary} />
      </div>
      <div className={cn("flex flex-none flex-col gap-2 px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]", steps.step === "friends" && "border-t border-border")}>
        <Button variant="primary" size="lg" icon={action.icon} fullWidth disabled={action.isDisabled} loading={steps.step === "identity" && identity.isSaving} onClick={action.run}>
          {action.label}
        </Button>
        <span className="min-h-[18px] text-center text-[13px] leading-[18px] text-fg-muted">{action.note}</span>
      </div>
    </main>
  );
}

function StepContent({
  step,
  identity,
  photo,
  photoUrl,
  initialLetter,
  firstName,
  summary,
}: {
  step: ProfileSetupStep;
  identity: SetupIdentity;
  photo: SetupPhotoControls;
  photoUrl: string | null;
  initialLetter: string;
  firstName: string;
  summary: SetupSummaryItem[];
}) {
  switch (step) {
    case "identity":
      return <SetupIdentityStep identity={identity} />;
    case "photo":
      return <SetupPhotoStep {...photo} photoUrl={photoUrl} initial={initialLetter} />;
    case "friends":
      return <SetupFriendsStep handle={identity.savedHandle} />;
    case "done":
      return <SetupDoneStep firstName={firstName} handle={identity.savedHandle} photoUrl={photoUrl} initial={initialLetter} items={summary} />;
  }
}
