"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Share2, Trash2 } from "lucide-react";
import type { WorkoutSummaryDetail } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { Banner, BottomSheet, Button, ConfirmDialog, DangerSheetOption, SavingOverlay, SheetOption } from "@/shared/components/ds";
import { DetailHeader } from "@/shared/components/detail-header";
import { SummaryFallback, type SummaryFallbackState } from "@/shared/components/workout-summary/summary-fallback";
import { WorkoutSummaryBody } from "@/shared/components/workout-summary/workout-summary-body";
import { exercisePath, summaryPath } from "@/features/evolution/helpers/paths";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { ShareStorySheet, STORY_SAVED_TOAST } from "@/features/share";
import { workoutEditPath } from "@/features/workout";
import { useDeleteWorkout, useEvolutionSource, useWorkoutSummary, type SummarySource } from "@/features/evolution/api/use-evolution";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/** Resumo de um treino concluído: /treino/resumo?id=<sessão>. */
export function SummaryScreen() {
  const sessionId = useSearchParams().get("id");
  const { dev } = useEvolutionSource();
  const summary = useWorkoutSummary(sessionId);
  const online = useOnlineStatus();
  const goBack = useGoBack();

  const loading = dev.forceLoading || (summary.isPending && summary.fetchStatus !== "idle");
  const data = summary.data?.value;
  const missing = !loading && (!sessionId && !dev.scenario ? true : summary.error?.code === "session_not_found");
  const offline = dev.forceOffline || !online || summary.data?.source === "device";
  const fallback: SummaryFallbackState | null = loading ? "loading" : missing ? "missing" : !data ? "error" : null;

  return (
    <main className="flex flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom))]">
      {fallback || !data ? (
        <SummaryFallback
          state={fallback ?? "error"}
          onBack={goBack}
          onRetry={() => void summary.refetch()}
          notices={offline && <OfflineBanner />}
        />
      ) : (
        // key: ao trocar para outro treino do dia (após excluir), a tela recomeça do zero.
        <SummaryContent
          key={data.id}
          summary={data}
          source={summary.data?.source ?? "network"}
          offline={offline}
          openDelete={dev.openDelete}
          mockScenario={dev.scenario}
          onBack={goBack}
        />
      )}
    </main>
  );
}

function OfflineBanner() {
  return (
    <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
      para editar ou excluir o treino, conecte-se à internet.
    </Banner>
  );
}

function SummaryContent({
  summary,
  source,
  offline,
  openDelete,
  mockScenario,
  onBack,
}: {
  summary: WorkoutSummaryDetail;
  source: SummarySource;
  offline: boolean;
  openDelete: boolean;
  /** Só desenvolvimento (?estado=): os stories também usam o mock. */
  mockScenario?: string | null;
  onBack: () => void;
}) {
  const shell = useAppShell();
  const router = useRouter();
  const remove = useDeleteWorkout();
  const [overlay, setOverlay] = useState<"menu" | "confirm" | "share" | null>(openDelete ? "confirm" : null);
  const pending = source === "pending";
  // Finalizado offline e ainda não enviado: o servidor ainda não tem o treino para editar ou excluir.
  const canChange = !offline && !pending;
  const unavailableReason = pending ? "Aguarde o envio do treino" : "Conecte-se à internet";
  const overline = summary.projectName ?? (summary.routineId ? null : "Treino livre");

  const confirmDelete = () => {
    setOverlay(null);
    remove.mutate(summary.id, {
      onSuccess: () => {
        shell.showToast("Treino excluído", { tone: "success" });
        // Ainda há treino neste dia: mostra o mais recente que sobrou; senão, sai da tela.
        const next = summary.daySessionIds.filter((id) => id !== summary.id).at(-1);
        if (next) router.replace(summaryPath(next));
        else onBack();
      },
      onError: (e) => shell.showToast(e.message, { tone: "error" }),
    });
  };

  return (
    <>
      <DetailHeader
        overline={overline}
        title={summary.name}
        position={{ index: summary.daySessionIds.indexOf(summary.id) + 1, total: summary.daySessionIds.length }}
        onBack={onBack}
        menuLabel="Mais opções do treino"
        onMenu={() => setOverlay("menu")}
      />
      <WorkoutSummaryBody
        summary={summary}
        onOpenExercise={(exerciseId) => router.push(exercisePath(exerciseId))}
        notices={
          <>
            {offline && <OfflineBanner />}
            {pending && (
              <Banner tone="warning" title="Envio pendente">
                treino salvo no aparelho; vai para o histórico quando a internet voltar.
              </Banner>
            )}
          </>
        }
        actions={
          // Stories: o treino precisa estar no servidor (finalizado sem internet: espera o envio).
          <Button variant="secondary" icon={Share2} fullWidth disabled={pending} onClick={() => setOverlay("share")} className="animate-guf-rise">
            {pending ? "Compartilhar quando o treino for enviado" : "Compartilhar nos Stories"}
          </Button>
        }
      />

      <ShareStorySheet
        open={overlay === "share"}
        sessionId={summary.id}
        mockScenario={mockScenario}
        onClose={() => setOverlay(null)}
        onSaved={() => shell.showToast(STORY_SAVED_TOAST[0], STORY_SAVED_TOAST[1])}
      />

      <BottomSheet placement="screen" open={overlay === "menu"} onClose={() => setOverlay(null)} title={summary.name}>
        <SheetOption
          icon={Pencil}
          title="Editar treino"
          subtitle={canChange ? "Séries, exercícios, observações e tempo" : `${unavailableReason} para editar`}
          disabled={!canChange}
          onClick={() => {
            setOverlay(null);
            router.push(workoutEditPath(summary.id));
          }}
        />
        <DangerSheetOption
          icon={Trash2}
          title="Excluir treino"
          subtitle={canChange ? undefined : `${unavailableReason} para excluir`}
          disabled={!canChange}
          onClick={() => setOverlay("confirm")}
        />
      </BottomSheet>

      <ConfirmDialog
        placement="screen"
        balanced
        open={overlay === "confirm"}
        title="Excluir este treino?"
        message="Ele sai do histórico, do calendário e da sua sequência de semanas, e os recordes conquistados nele deixam de contar. Não dá para desfazer."
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        onCancel={() => setOverlay(null)}
        onConfirm={confirmDelete}
      />
      <SavingOverlay open={remove.isPending} title="Excluindo treino" message="Leva só um instante." variant={2} />
    </>
  );
}
