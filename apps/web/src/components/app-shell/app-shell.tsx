"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Info, Play, Plus } from "lucide-react";
import { estimateRoutineMinutes, plural, startedAgoLabel, suggestNextRoutine, toLocalISODate } from "@guf/core";
import type { RoutineSummary } from "@guf/api";
import { BottomNav, BottomSheet, SheetOption, Toast } from "@/components/ds";
import { useHomeSummary, useStartWorkout } from "@/hooks/use-home-summary";
import { cn } from "@/lib/utils";
import { MiniWorkoutCard } from "@/components/workout/mini-workout-card";
import { useActiveWorkout } from "@/components/workout/workout-provider";

const TOAST_MS = 1800;

/** Rotas de cada aba (índice do BottomNav). null = tela ainda não construída. */
const TAB_ROUTES: Array<{ path: string | null; name: string }> = [
  { path: "/", name: "Início" },
  { path: null, name: "Histórico" },
  { path: null, name: "Treinar" },
  { path: null, name: "Projetos" },
  { path: null, name: "Perfil" },
];

interface AppShellApi {
  showToast: (message: string) => void;
  openStartSheet: () => void;
  /** Inicia um treino (rotina ou vazio) e avisa o resultado. */
  startWorkout: (routine: Pick<RoutineSummary, "id" | "name"> | null) => void;
  /** Abre o treino em andamento (tela de treino: /treino?id=…). */
  openWorkout: (sessionId: string) => void;
}

const AppShellContext = createContext<AppShellApi | null>(null);

export function useAppShell(): AppShellApi {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell precisa estar dentro de <AppShell>.");
  return ctx;
}

/** "Treino B – Costas e Bíceps" → "Treino B" */
export function routineShortName(name: string): string {
  return name.split(" – ")[0] ?? name;
}

/** Letra da rotina: "Treino B – …" → "B"; outros nomes → inicial. */
export function routineLetter(name: string): string {
  const match = /^Treino\s+(\S)/i.exec(name);
  return (match?.[1] ?? name.trim().charAt(0)).toUpperCase();
}

export function routineMeta(routine: RoutineSummary): string {
  const parts = [plural(routine.exercises.length, "exercício", "exercícios")];
  const minutes = estimateRoutineMinutes(routine.exercises);
  if (minutes) parts.push(`~${minutes} min`);
  return parts.join(" · ");
}

/**
 * Moldura da área logada: conteúdo (coluna mobile de até 430px), menu inferior fixo,
 * toast acima do menu e a folha "Iniciar treino" (aba central "Treinar").
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // trailingSlash: true → normalizar "/treino/" para "/treino".
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const { active } = useActiveWorkout();
  // Tela de treino é imersiva: sem menu inferior e sem mini card (ela tem o próprio rodapé).
  const immersive = pathname === "/treino";
  const summary = useHomeSummary();
  const start = useStartWorkout();
  const [toast, setToast] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const startWorkoutFor = useCallback(
    (routine: Pick<RoutineSummary, "id" | "name"> | null) => {
      setStartOpen(false);
      start.mutate(routine?.id ?? null, {
        onSuccess: ({ sessionId }) => {
          showToast(routine ? `${routineShortName(routine.name)} iniciado` : "Treino vazio iniciado");
          router.push(`/treino?id=${encodeURIComponent(sessionId)}`);
        },
        onError: (error) => showToast(error.message),
      });
    },
    [start, showToast, router],
  );

  const openWorkout = useCallback(
    (sessionId: string) => {
      setStartOpen(false);
      router.push(`/treino?id=${encodeURIComponent(sessionId)}`);
    },
    [router],
  );

  const api = useMemo<AppShellApi>(
    () => ({ showToast, openStartSheet: () => setStartOpen(true), startWorkout: startWorkoutFor, openWorkout }),
    [showToast, startWorkoutFor, openWorkout],
  );

  const tabIndex = Math.max(0, TAB_ROUTES.findIndex((t) => t.path === pathname));
  // Treino aberto: o acompanhado no aparelho ou o que o banco informa.
  const inProgress = active
    ? { id: active.sessionId, name: active.name, startedAt: active.clock.startedAt }
    : (summary.data?.inProgress ?? null);
  const showMiniCard = Boolean(active) && !immersive;

  const onNav = (index: number) => {
    // "Treinar": com treino aberto, retoma (um treino em andamento por vez); senão, escolhe o que iniciar.
    if (index === 2) return inProgress ? openWorkout(inProgress.id) : setStartOpen(true);
    const tab = TAB_ROUTES[index];
    if (!tab || tab.path === pathname) return;
    if (tab.path) return router.push(tab.path);
    showToast(`${tab.name} chega em breve`);
  };

  // Rotinas do projeto ativo, com a sugerida de hoje em destaque (se ainda não treinou hoje).
  const data = summary.data;
  const today = toLocalISODate(new Date());
  const routines = data?.activeProject?.routines ?? [];
  const trainedToday = data?.weekSessions.some((s) => s.performedOn === today) ?? false;
  const suggested = trainedToday ? null : suggestNextRoutine(routines, data?.lastFinishedRoutineId ?? null);

  return (
    <AppShellContext.Provider value={api}>
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col",
          immersive
            ? ""
            : showMiniCard
              ? "pb-[calc(168px+env(safe-area-inset-bottom))]"
              : "pb-[calc(92px+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed inset-x-4 z-20 mx-auto max-w-[398px] animate-guf-rise-fast",
            immersive
              ? "bottom-[calc(114px+env(safe-area-inset-bottom))]"
              : showMiniCard
                ? "bottom-[calc(168px+env(safe-area-inset-bottom))]"
                : "bottom-[calc(92px+env(safe-area-inset-bottom))]",
          )}
        >
          <Toast message={toast} icon={Info} />
        </div>
      )}

      {showMiniCard && (
        <MiniWorkoutCard
          onOpen={openWorkout}
          className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[15] mx-auto max-w-[406px]"
        />
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px]",
          immersive && "hidden",
        )}
      >
        <BottomNav
          value={tabIndex}
          onChange={onNav}
          className="mx-auto max-w-[430px] border-t-0 bg-transparent backdrop-blur-none"
        />
      </div>

      <BottomSheet
        placement="screen"
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title={inProgress ? "Treino em andamento" : "Iniciar treino"}
        subtitle={inProgress ? undefined : data?.activeProject?.name}
      >
        {inProgress ? (
          // O banco aceita só 1 treino em andamento: oferecer retomar em vez de iniciar outro.
          <>
            <p className="m-0 text-sm leading-5 text-fg-secondary">
              Finalize o treino aberto antes de começar outro.
            </p>
            <SheetOption
              icon={Play}
              title={inProgress.name}
              subtitle={`Retomar · ${startedAgoLabel(inProgress.startedAt)}`}
              highlighted
              onClick={() => openWorkout(inProgress.id)}
            />
          </>
        ) : (
          <>
            {routines.map((r) => (
              <SheetOption
                key={r.id}
                letter={routineLetter(r.name)}
                title={r.name}
                subtitle={r.id === suggested?.id ? `Sugerida · ${routineMeta(r)}` : routineMeta(r)}
                highlighted={r.id === suggested?.id}
                onClick={() => startWorkoutFor(r)}
              />
            ))}
            <SheetOption icon={Plus} title="Treino vazio" dashed onClick={() => startWorkoutFor(null)} />
          </>
        )}
      </BottomSheet>
    </AppShellContext.Provider>
  );
}
