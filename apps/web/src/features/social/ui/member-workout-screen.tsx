"use client";

import { useSearchParams } from "next/navigation";
import { DetailHeader } from "@/shared/components/detail-header";
import { SummaryFallback, type SummaryFallbackState } from "@/shared/components/workout-summary/summary-fallback";
import { WorkoutSummaryBody } from "@/shared/components/workout-summary/workout-summary-body";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useMemberWorkout, useSocialSource } from "@/features/social/api/use-social";
import { DetailScreen } from "@/shared/components/detail-screen";

/**
 * Treino concluído de outra pessoa: /pessoa/treino?id=<sessão>, aberto pelo histórico do perfil.
 * Mesma tela do resumo, só leitura: sem observações, projeto, excluir, Stories nem evolução.
 */
export function MemberWorkoutScreen() {
  const sessionId = useSearchParams().get("id");
  const { dev } = useSocialSource();
  const workout = useMemberWorkout(sessionId);
  const goBack = useGoBack();

  const data = workout.data;
  const loading = dev.forceLoading || (workout.isPending && workout.fetchStatus !== "idle");
  const missing = !loading && (!sessionId || workout.error?.code === "session_not_found");
  const fallback: SummaryFallbackState | null = loading ? "loading" : missing ? "missing" : !data ? "error" : null;

  return (
    <DetailScreen>
      {fallback || !data ? (
        <SummaryFallback state={fallback ?? "error"} onBack={goBack} onRetry={() => void workout.refetch()} errorMessage={workout.error?.message} />
      ) : (
        <>
          <DetailHeader
            title={data.name}
            subtitle={`@${data.owner.handle}`}
            position={{ index: data.daySessionIds.indexOf(data.id) + 1, total: data.daySessionIds.length }}
            onBack={goBack}
          />
          <WorkoutSummaryBody key={data.id} summary={data} />
        </>
      )}
    </DetailScreen>
  );
}
