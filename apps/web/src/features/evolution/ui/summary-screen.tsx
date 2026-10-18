"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarX, Pause, Share2, Trash2 } from "lucide-react";
import { formatElapsed, formatNumber, pauseSummaryLabel, plural, toDisplayWeight, workoutDateTimeLabel } from "@guf/core";
import type { WorkoutSummaryDetail } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { Banner, BottomSheet, Button, ConfirmDialog, EmptyState, Icon, SavingOverlay } from "@/shared/components/ds";
import { DetailHeader } from "@/features/evolution/components/detail-header";
import { summaryPath } from "@/features/evolution/helpers/paths";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { ShareStorySheet, STORY_SAVED_TOAST } from "@/features/share";
import { useCountUp } from "@/shared/hooks/use-count-up";
import { useDeleteWorkout, useEvolutionSource, useWorkoutSummary, type SummarySource } from "@/features/evolution/api/use-evolution";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { cn } from "@/shared/helpers/class-names";
import { SummaryExerciseCard } from "@/features/evolution/components/summary-exercise-card";
import { SummaryRecords } from "@/features/evolution/components/summary-records";
import { SummarySkeleton } from "@/features/evolution/components/summary-skeleton";

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

  return (
    <main className="flex flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom))]">
      {loading || !data || missing ? (
        <>
          <DetailHeader loading={loading} title={missing ? "Treino" : undefined} onBack={goBack} />
          <div className="flex flex-col gap-4 pt-2">
            {offline && !missing && <OfflineBanner />}
            {loading ? (
              <SummarySkeleton />
            ) : missing ? (
              <div className="mt-[72px] animate-guf-rise">
                <EmptyState
                  icon={CalendarX}
                  title="Treino não encontrado"
                  message="Este treino foi excluído ou não está mais disponível."
                  actionLabel="Voltar"
                  onAction={goBack}
                  bordered={false}
                />
              </div>
            ) : (
              <Banner tone="danger" actionLabel="Tentar" onAction={() => void summary.refetch()}>
                Não foi possível carregar o treino. Verifique a internet e tente de novo.
              </Banner>
            )}
          </div>
        </>
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
      para excluir o treino, conecte-se à internet.
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
  const unit = summary.weightUnit;
  const pending = source === "pending";
  // Finalizado offline e ainda não enviado: o servidor ainda não tem o treino para excluir.
  const canDelete = !offline && !pending;
  const pauseText = pauseSummaryLabel(summary.pauseCount, summary.pausedSeconds);
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
      <div className="flex flex-col gap-4 pt-2">
        {offline && <OfflineBanner />}
        {pending && (
          <Banner tone="warning" title="Envio pendente">
            treino salvo no aparelho; vai para o histórico quando a internet voltar.
          </Banner>
        )}

        <span className="flex animate-guf-rise items-center gap-2 text-sm leading-5 text-fg-secondary tabular-nums">
          <Icon icon={CalendarDays} size={16} className="text-fg-muted" />
          {workoutDateTimeLabel(summary.performedOn, summary.startedAt)}
        </span>

        <SummaryStats summary={summary} pauseText={pauseText} />
        {/* Stories: o treino precisa estar no servidor (finalizado sem internet: espera o envio). */}
        <Button
          variant="secondary"
          icon={Share2}
          fullWidth
          disabled={pending}
          onClick={() => setOverlay("share")}
          className="animate-guf-rise"
        >
          {pending ? "Compartilhar quando o treino for enviado" : "Compartilhar nos Stories"}
        </Button>
        {summary.records.length > 0 && <SummaryRecords records={summary.records} unit={unit} />}

        <section aria-labelledby="summary-exercises" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-1 pt-1">
            <h2 id="summary-exercises" className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">
              Exercícios
            </h2>
            <span className="text-[13px] text-fg-muted">{plural(summary.exercises.length, "exercício", "exercícios")}</span>
          </div>
          {summary.exercises.map((exercise, i) => (
            <SummaryExerciseCard key={exercise.id} exercise={exercise} unit={unit} index={i} />
          ))}
        </section>
      </div>

      <ShareStorySheet
        open={overlay === "share"}
        sessionId={summary.id}
        mockScenario={mockScenario}
        onClose={() => setOverlay(null)}
        onSaved={() => shell.showToast(STORY_SAVED_TOAST[0], STORY_SAVED_TOAST[1])}
      />

      <BottomSheet placement="screen" open={overlay === "menu"} onClose={() => setOverlay(null)} title={summary.name}>
        <button
          type="button"
          disabled={!canDelete}
          aria-disabled={!canDelete}
          onClick={() => setOverlay("confirm")}
          className={cn(
            "flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border border-danger/40 bg-danger/12 px-3.5 py-2.5 text-left text-danger transition-colors duration-150 ease-standard",
            canDelete ? "cursor-pointer hover:bg-danger/20" : "cursor-not-allowed opacity-55",
          )}
        >
          <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-danger/16">
            <Icon icon={Trash2} size={18} />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] leading-5 font-semibold">Excluir treino</span>
            {!canDelete && (
              <span className="text-[13px] leading-[18px] text-fg-secondary">
                {pending ? "Aguarde o envio do treino para excluir" : "Conecte-se à internet para excluir"}
              </span>
            )}
          </span>
        </button>
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

function SummaryStats({ summary, pauseText }: { summary: WorkoutSummaryDetail; pauseText: string | null }) {
  const unit = summary.weightUnit;
  const duration = useCountUp(summary.durationSeconds, { delayMs: 120, durationMs: 700 });
  const volumeTarget = Math.round(toDisplayWeight(summary.volumeKg, unit) ?? 0);
  const volume = useCountUp(volumeTarget, { delayMs: 120, durationMs: 700 });
  const sets = useCountUp(summary.setCount, { delayMs: 120, durationMs: 700 });
  const stats = [
    { value: formatElapsed(duration), label: "Duração", aria: `Duração ${formatElapsed(summary.durationSeconds)}${pauseText ? ", tempo efetivo" : ""}` },
    { value: formatNumber(volume, 0), label: `Volume (${unit})`, aria: `Volume ${formatNumber(volumeTarget, 0)} ${unit}` },
    { value: String(sets), label: "Séries", aria: plural(summary.setCount, "série", "séries") },
  ];
  return (
    <section aria-label="Números do treino" className="flex flex-none animate-guf-rise flex-col gap-3.5 rounded-lg border border-border bg-surface px-2 pt-5 pb-4 shadow-e1 [animation-delay:40ms]">
      <div className="grid grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} role="group" aria-label={s.aria} className={cn("flex flex-col items-center gap-1", i > 0 && "border-l border-border")}>
            <span aria-hidden="true" className="font-display text-[38px] leading-10 font-bold tracking-[-0.01em] tabular-nums">
              {s.value}
            </span>
            <span aria-hidden="true" className="text-xs leading-4 text-fg-muted">
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {pauseText && (
        <span className="mx-2 flex items-center justify-center gap-1.5 border-t border-border pt-3 text-[13px] leading-[18px] text-fg-secondary tabular-nums">
          <Icon icon={Pause} size={14} className="text-fg-muted" />
          {pauseText}
        </span>
      )}
    </section>
  );
}
