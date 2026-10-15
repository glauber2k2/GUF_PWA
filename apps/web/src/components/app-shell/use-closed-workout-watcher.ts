"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getWorkoutStatus } from "@guf/api";
import { summaryPath } from "@/components/evolution/paths";
import { useActiveWorkout } from "@/components/workout/workout-provider";
import { dropWorkoutLocally, isClosedLocally, onWorkoutClosedOnServer, type ServerClosedWorkout } from "@/lib/offline/outbox";
import { invalidateTrainingData } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import type { ToastOptions } from "@/lib/toast/toast-store";

/** Intervalo da checagem enquanto o app está aberto (a finalização automática roda a cada 5 min). */
const CHECK_INTERVAL_MS = 60_000;

/** Aviso ao usuário: quem encerrou e se alterações do aparelho ficaram de fora. */
function closedToast({ status, autoFinished, droppedChanges }: ServerClosedWorkout): { title: string; options: ToastOptions } {
  const lost = droppedChanges > 0 ? " As alterações feitas depois disso não foram salvas." : "";
  const tone = droppedChanges > 0 ? "warning" : "info";
  if (status === "missing") {
    return { title: "Treino encerrado", options: { tone, message: `Este treino não está mais disponível.${lost}` } };
  }
  if (autoFinished) {
    return {
      title: "Treino encerrado automaticamente",
      options: {
        tone,
        message: droppedChanges > 0 ? `Ele terminou 30 min após a última série.${lost}` : "Ele terminou 30 min após a última série e já está no seu histórico.",
      },
    };
  }
  return {
    title: "Treino finalizado",
    options: { tone, message: droppedChanges > 0 ? `Ele foi finalizado em outro aparelho.${lost}` : "Ele foi finalizado em outro aparelho e já está no seu histórico." },
  };
}

/**
 * Fecha no aparelho o treino que o SERVIDOR já encerrou (finalização automática ou outro aparelho):
 * descarta gravações pendentes e o retrato local, tira o mini card e, se a tela do treino estiver
 * aberta, leva ao resumo (o treino já está no histórico). Checa a cada minuto com o app visível,
 * ao voltar para o app e quando a fila descarta alterações de um treino encerrado (ex.: a internet
 * voltou depois do encerramento automático). Devolve `resolveClosedWorkout` para a tela do treino
 * usar quando "Finalizar" encontra o treino já encerrado.
 */
export function useClosedWorkoutWatcher(showToast: (title: string, options?: ToastOptions) => number) {
  const { active, clear } = useActiveWorkout();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Último estado visto (respostas assíncronas leem daqui, sem reinscrever os efeitos).
  // Cenários de demonstração (persist = false) não gravam nada e ficam de fora.
  const activeId = active?.persist ? active.sessionId : null;
  const activeIdRef = useRef(activeId);
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    activeIdRef.current = activeId;
    pathnameRef.current = pathname;
  }, [activeId, pathname]);
  // Cada treino é avisado uma vez só (a fila, a checagem e o "Finalizar" podem chegar juntos).
  const handled = useRef(new Set<string>());

  const close = useCallback(
    (info: ServerClosedWorkout) => {
      const isActive = activeIdRef.current === info.sessionId;
      // Treino que não está mais aberto aqui (ex.: finalizado sem internet): avisa se alterações
      // ficaram de fora ou se o servidor já o tinha encerrado automaticamente.
      if (!isActive && info.droppedChanges === 0 && !info.autoFinished) return;
      if (handled.current.has(info.sessionId)) return;
      handled.current.add(info.sessionId);

      if (isActive) clear();
      void invalidateTrainingData(queryClient);
      const onWorkoutScreen = pathnameRef.current === "/treino";
      const { title, options } = closedToast(info);
      const canOpenSummary = info.status === "completed";
      showToast(title, {
        ...options,
        ...(canOpenSummary && !onWorkoutScreen && { actionLabel: "Ver resumo", onAction: () => router.push(summaryPath(info.sessionId)) }),
      });
      if (onWorkoutScreen) router.replace(canOpenSummary ? summaryPath(info.sessionId) : "/");
    },
    [clear, queryClient, router, showToast],
  );

  /** Consulta o servidor; encerrado → descarta o que estiver no aparelho e fecha. true = estava encerrado. */
  const resolveClosedWorkout = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const { data, error } = await getWorkoutStatus(getSupabaseClient(), { sessionId });
      // Sem internet (ou falha na consulta): tenta de novo na próxima checagem.
      if (error || data.status === "in_progress") return false;
      const droppedChanges = await dropWorkoutLocally(sessionId);
      close({ sessionId, status: data.status, autoFinished: data.autoFinished, droppedChanges });
      return true;
    },
    [close],
  );

  const check = useCallback(async () => {
    const sessionId = activeIdRef.current;
    if (!sessionId || document.visibilityState !== "visible") return;
    // Finalizado/descartado no aparelho e ainda na fila: o próprio envio resolve.
    if (await isClosedLocally(sessionId)) return;
    await resolveClosedWorkout(sessionId);
  }, [resolveClosedWorkout]);

  // A fila descartou um treino encerrado no servidor (vale também para treinos já fechados na tela).
  useEffect(() => onWorkoutClosedOnServer(close), [close]);

  useEffect(() => {
    if (!activeId) return;
    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, check]);

  return resolveClosedWorkout;
}
