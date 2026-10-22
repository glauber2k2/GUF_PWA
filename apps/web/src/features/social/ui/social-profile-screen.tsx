"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Ellipsis, Lock } from "lucide-react";
import { monthYearLabel, trainingTenure } from "@guf/core";
import { Avatar, Banner, Icon, IconButton, Skeleton } from "@/shared/components/ds";
import { useProfile } from "@/features/profile";
import { summaryPath } from "@/features/evolution";
import { useGoBack } from "@/shared/hooks/use-go-back";
import {
  useCanUseSocial,
  useMemberEvolution,
  useMemberProfile,
  useMemberWorkouts,
  useSocialSource,
} from "@/features/social/api/use-social";
import { LockedProfile, ProfileCounts, ProfileEvolution, ProfileHistory, ProfileStreak } from "@/features/social/components/profile-sections";
import { EVOLUTION_WEEKS } from "@/features/social/constants/profile-evolution";
import { useProfileEvolutionPeriod } from "@/features/social/hooks/use-profile-evolution-period";
import { SelfActions, VisitorActions, VisitorOptionsSheet } from "@/features/social/components/profile-actions";
import { EditProfileSheet } from "@/features/social/components/edit-profile-sheet";
import { FollowRequestsBar } from "@/features/social/components/follow-requests-bar";
import { memberWorkoutPath } from "@/features/social/helpers/paths";
import { PlanBadge, usePlanGate } from "@/features/plans";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex items-center gap-4">
        <Skeleton className="size-[74px] rounded-pill" />
        <Skeleton className="h-14 flex-1 rounded-md" />
      </div>
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-[88px] w-full rounded-lg" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
}

/**
 * Perfil social (protótipo "Perfil Social"): o seu (aba Perfil; null) ou o de outra pessoa (/pessoa).
 * Cartão para qualquer conta; números, sequência e evolução só com o perfil desbloqueado;
 * histórico só se a pessoa não ocultou.
 */
export function SocialProfileScreen({ userId }: { userId: string | null }) {
  const router = useRouter();
  const goBack = useGoBack("/competicao");
  const { dev } = useSocialSource();
  const profile = useMemberProfile(userId);
  const own = useProfile();
  const canUse = useCanUseSocial();
  const unit = own.data?.weightUnit ?? "kg";
  const [editOpen, setEditOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const data = profile.data;
  const unlocked = Boolean(data?.unlocked);
  const isSelf = userId === null || data?.isSelf;
  const evolutionPeriod = useProfileEvolutionPeriod(Boolean(isSelf));
  const evolution = useMemberEvolution(userId, EVOLUTION_WEEKS[evolutionPeriod.period], unlocked);
  const workouts = useMemberWorkouts(userId, unlocked && Boolean(data?.historyVisible));
  const loading = dev.forceLoading || profile.isPending;
  const { entitlements } = usePlanGate();

  return (
    <main className="flex flex-col gap-5 px-4">
      <div className="sticky top-0 z-[5] -mx-4 flex h-[52px] items-center gap-2 bg-background/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        {!isSelf && <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 pl-2 text-base leading-[22px] font-semibold">
          <span className="truncate">{data ? `@${data.handle}` : ""}</span>
          {/* Só o seu plano: o de outra pessoa não é compartilhado (revisar o RIPD social antes de mostrar). */}
          {isSelf && entitlements && <PlanBadge user={entitlements} className="flex-none" />}
          {data?.visibility === "private" && <Icon icon={Lock} size={14} label="Perfil privado" className="flex-none text-fg-muted" />}
        </span>
        <IconButton
          icon={Ellipsis}
          label={isSelf ? "Configurações" : "Mais opções"}
          variant="ghost"
          onClick={() => (isSelf ? router.push("/configuracoes") : setOptionsOpen(true))}
          disabled={!data}
        />
      </div>

      {!canUse && (
        <Banner tone="warning" title="Sem conexão">
          para seguir pessoas ou mudar a privacidade, conecte-se à internet.
        </Banner>
      )}

      {loading ? (
        <ProfileSkeleton />
      ) : profile.isError || !data ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void profile.refetch()}>
          {profile.error?.message ?? "Não foi possível carregar o perfil. Verifique a internet e tente de novo."}
        </Banner>
      ) : (
        <>
          {/* Perfil aberto aceita os pedidos na hora: a barra só existe no privado. */}
          {isSelf && data.visibility === "private" && <FollowRequestsBar />}
          <section aria-label="Perfil" className="flex flex-col gap-[18px] pt-1">
            <div className="flex items-center gap-4">
              <span className="grid flex-none rounded-pill border-2 border-accent p-[3px]">
                <Avatar src={data.avatarUrl} name={data.name ?? data.handle} size="lg" tone="accent" />
              </span>
              <ProfileCounts profile={data} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-2xl leading-[30px] font-bold tracking-[-0.02em]">{data.name ?? `@${data.handle}`}</h1>
              {data.firstWorkoutOn && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-5 text-fg-secondary">
                  <span className="whitespace-nowrap">Treina no guf há {trainingTenure(data.firstWorkoutOn, new Date())}</span>
                  <span className="whitespace-nowrap text-fg-muted">desde {monthYearLabel(data.firstWorkoutOn)}</span>
                </div>
              )}
            </div>
            {isSelf ? <SelfActions handle={data.handle} onEdit={() => setEditOpen(true)} /> : <VisitorActions profile={data} />}
          </section>

          {!data.unlocked ? (
            <LockedProfile profile={data} />
          ) : (
            <>
              <ProfileStreak profile={data} />
              <ProfileEvolution weeks={evolution.data} loading={evolution.isPending} periods={evolutionPeriod.periods} period={evolutionPeriod.period} onPeriod={evolutionPeriod.changePeriod} unit={unit} />
              <ProfileHistory
                profile={data}
                workouts={workouts.data?.pages.flat() ?? []}
                loading={workouts.isPending}
                hasMore={Boolean(workouts.hasNextPage)}
                loadingMore={workouts.isFetchingNextPage}
                onMore={() => void workouts.fetchNextPage()}
                onOpenWorkout={(id) => router.push(isSelf ? summaryPath(id) : memberWorkoutPath(id))}
                unit={unit}
              />
            </>
          )}

          {isSelf ? (
            <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} name={data.name} handle={data.handle} />
          ) : (
            <VisitorOptionsSheet profile={data} open={optionsOpen} onClose={() => setOptionsOpen(false)} />
          )}
        </>
      )}

    </main>
  );
}
