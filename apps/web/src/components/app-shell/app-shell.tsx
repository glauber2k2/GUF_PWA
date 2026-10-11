"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Info, ListPlus, Play, Plus, type LucideIcon } from "lucide-react";
import { fromLocalISODate, routineLetter, routineMeta, routineShortName, startedAgoLabel, todayPlan, toLocalISODate } from "@guf/core";
import type { RoutineSummary } from "@guf/api";
import { BottomNav, BottomSheet, LoadingScreen, SheetOption, Toast } from "@/components/ds";
import { useDevHomeState } from "@/hooks/use-dev-home-state";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useHomeSummary, useStartWorkout } from "@/hooks/use-home-summary";
import { hasPendingFor, isClosedLocally } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";
import { MiniWorkoutCard } from "@/components/workout/mini-workout-card";
import { newRoutinePathFor } from "@/components/projects/paths";
import { useActiveWorkout } from "@/components/workout/workout-provider";

const TOAST_MS = 1800;
/** Toast com ação ("Desfazer") fica mais tempo na tela. */
const TOAST_ACTION_MS = 4000;

/** Telas cheias (com o próprio cabeçalho/rodapé), sem menu inferior. */
const IMMERSIVE_ROUTES = new Set(["/treino", "/rotina", "/treino/resumo", "/exercicio", "/exercicio/busca"]);

/** Rotas de cada aba (índice do BottomNav). null = tela ainda não construída. */
const TAB_ROUTES: Array<{ path: string | null; name: string }> = [
  { path: "/", name: "Início" },
  { path: "/historico", name: "Histórico" },
  { path: null, name: "Treinar" },
  { path: "/projetos", name: "Projetos" },
  { path: "/perfil", name: "Perfil" },
];

export interface ToastOptions {
  icon?: LucideIcon;
  /** Ação do toast (ex.: "Desfazer"); com ação, o toast fica 4 s. */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState extends ToastOptions {
  message: string;
}

interface AppShellApi {
  showToast: (message: string, options?: ToastOptions) => void;
  /** Tela com barra de ação fixa acima do menu: o toast sobe para não cobri-la. */
  setToastRaised: (raised: boolean) => void;
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

/**
 * Moldura da área logada: conteúdo (coluna mobile de até 430px), menu inferior fixo,
 * toast acima do menu e a folha "Iniciar treino" (aba central "Treinar").
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // trailingSlash: true → normalizar "/treino/" para "/treino".
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const { active, track, clear } = useActiveWorkout();
  const devHome = useDevHomeState();
  // Treino, edição de rotina, resumo e evolução são imersivos: sem menu inferior e sem mini card.
  const immersive = IMMERSIVE_ROUTES.has(pathname);
  const summary = useHomeSummary();
  const online = useOnlineStatus();
  // Abertura: depois do login, a tela de carregamento fica até os dados do usuário chegarem
  // (uma vez por sessão). Sem internet não bloqueia: o treino offline precisa abrir.
  const [booted, setBooted] = useState(false);
  if (!booted && (summary.data || summary.isError || !online)) setBooted(true);
  const start = useStartWorkout();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastRaised, setToastRaised] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, ...options });
    toastTimer.current = setTimeout(() => setToast(null), options?.actionLabel ? TOAST_ACTION_MS : TOAST_MS);
  }, [setToast]);

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
    [start, showToast, router, setStartOpen],
  );

  const openWorkout = useCallback(
    (sessionId: string) => {
      setStartOpen(false);
      router.push(`/treino?id=${encodeURIComponent(sessionId)}`);
    },
    [router, setStartOpen],
  );

  const api = useMemo<AppShellApi>(
    () => ({ showToast, setToastRaised, openStartSheet: () => setStartOpen(true), startWorkout: startWorkoutFor, openWorkout }),
    [showToast, startWorkoutFor, openWorkout, setToastRaised, setStartOpen],
  );

  // Treino aberto no banco → mini card e aba Treinar acompanham (sem redirecionar).
  // Sem treino no banco e nada pendente no aparelho → o mini card some.
  const serverInProgress = summary.data?.inProgress;
  const summaryLoaded = summary.isSuccess;
  const activeId = active?.sessionId ?? null;
  const activePersist = active?.persist ?? false;
  useEffect(() => {
    if (!summaryLoaded) return;
    let cancelled = false;
    void (async () => {
      if (serverInProgress) {
        if (await isClosedLocally(serverInProgress.id)) return;
        if (cancelled) return;
        track({
          sessionId: serverInProgress.id,
          name: serverInProgress.name,
          clock: { startedAt: serverInProgress.startedAt, periods: serverInProgress.activePeriods },
          // Cenários de demonstração (?estado=) não gravam nada.
          persist: !devHome.scenario,
        });
      } else if (activeId && activePersist && !devHome.scenario) {
        if (await hasPendingFor(activeId)) return;
        if (!cancelled) clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summaryLoaded, serverInProgress, activeId, activePersist, devHome.scenario, track, clear]);

  // Aba ativa também nas telas internas dela (ex.: /projetos/detalhe → Projetos).
  const tabIndex = Math.max(
    0,
    TAB_ROUTES.findIndex((t) => t.path === pathname || (t.path && t.path !== "/" && pathname.startsWith(`${t.path}/`))),
  );
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
    // Na tela interna de uma aba, tocar na aba volta para a lista dela.
    if (tab.path) return router.push(tab.path);
    showToast(`${tab.name} chega em breve`);
  };

  // Rotinas do projeto ativo, com a sugerida de hoje em destaque (se ainda não treinou hoje).
  const data = summary.data;
  const today = toLocalISODate(new Date());
  const routines = data?.activeProject?.routines ?? [];
  const trainedToday = data?.weekSessions.some((s) => s.performedOn === today) ?? false;
  // Destaque = treino de hoje (pelos dias da semana ou, sem dias marcados, pela ordem); dia de descanso: nenhum.
  const plan = todayPlan(routines, data?.lastFinishedRoutineId ?? null, fromLocalISODate(today));
  const suggested = trainedToday || (plan.kind !== "scheduled" && plan.kind !== "sequence") ? null : plan.routine;

  if (!booted) return <LoadingScreen />;

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
              : showMiniCard || toastRaised
                ? "bottom-[calc(168px+env(safe-area-inset-bottom))]"
                : "bottom-[calc(92px+env(safe-area-inset-bottom))]",
          )}
        >
          <Toast
            message={toast.message}
            icon={toast.icon ?? Info}
            actionLabel={toast.actionLabel}
            onAction={() => {
              toast.onAction?.();
              setToast(null);
            }}
          />
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
                subtitle={r.id === suggested?.id ? `Sugerida · ${routineMeta(r.exercises)}` : routineMeta(r.exercises)}
                highlighted={r.id === suggested?.id}
                onClick={() => startWorkoutFor(r)}
              />
            ))}
            {routines.length === 0 && (
              <SheetOption
                icon={ListPlus}
                title="Montar uma rotina"
                subtitle="Crie um projeto com Treino A, B, C…"
                onClick={() => {
                  setStartOpen(false);
                  router.push(newRoutinePathFor(data?.activeProject?.id));
                }}
              />
            )}
            <SheetOption icon={Plus} title="Treino vazio" dashed onClick={() => startWorkoutFor(null)} />
          </>
        )}
      </BottomSheet>
    </AppShellContext.Provider>
  );
}
