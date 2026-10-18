"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ListPlus, Play, Plus } from "lucide-react";
import { fromLocalISODate, routineLetter, routineMeta, routineShortName, startedAgoLabel, todayPlan, toLocalISODate } from "@guf/core";
import type { RoutineSummary } from "@guf/api";
import { BottomNav, BottomSheet, LoadingScreen, SavingOverlay, ScreenPortal, SheetOption, ToastStack } from "@/shared/components/ds";
import { useDevHomeState } from "@/features/home";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useHomeSummary, useStartWorkout } from "@/features/home";
import { hasPendingFor, isClosedLocally } from "@/shared/offline/outbox";
import { createToastStore, TOAST_DURATION_MS, type ToastOptions } from "@/store/global/toast.store";
import { cn } from "@/shared/helpers/class-names";
import { MiniWorkoutCard } from "@/features/workout";
import { newRoutinePathFor } from "@/features/projects";
import { useActiveWorkout } from "@/features/workout";
import { useClosedWorkoutWatcher } from "@/features/app-shell/hooks/use-closed-workout-watcher";

/** Telas cheias (com o próprio cabeçalho/rodapé), sem menu inferior. */
const IMMERSIVE_ROUTES = new Set(["/treino", "/rotina", "/treino/resumo", "/exercicio", "/exercicio/busca"]);

/** Rotas de cada aba (índice do BottomNav) e das telas internas que mantêm a aba acesa. */
const TAB_ROUTES: Array<{ path: string | null; name: string; inner?: string[] }> = [
  { path: "/", name: "Início" },
  { path: "/historico", name: "Histórico" },
  { path: null, name: "Treinar" },
  { path: "/competicao", name: "Competir", inner: ["/buscar-pessoas"] },
  { path: "/projetos", name: "Projetos" },
  { path: "/perfil", name: "Perfil", inner: ["/configuracoes", "/seguidores"] },
];

/** Limite do overlay "Iniciando treino" depois que a sessão foi criada (se a tela do treino não abrir). */
const OPENING_TIMEOUT_MS = 8000;

export type { ToastOptions, ToastTone } from "@/store/global/toast.store";

interface AppShellApi {
  /**
   * Mostra um aviso na pilha (5 s; "carregando" não expira) e devolve o id.
   * Ex.: showToast("Projeto salvo", { tone: "success" }) ·
   * showToast("Série removida", { tone: "undo", icon: Trash2, actionLabel: "Desfazer", onAction }).
   */
  showToast: (title: string, options?: ToastOptions) => number;
  /** Troca o conteúdo de um aviso (ex.: "carregando" → "success"); reinicia o tempo. */
  updateToast: (id: number, title: string, options?: ToastOptions) => void;
  dismissToast: (id: number) => void;
  /**
   * Barra de ação fixa no rodapé (ex.: "Ativar este projeto", descanso do treino): a pilha sobe para
   * não cobri-la. Devolve a função que desfaz. Nas telas, use o hook `useRaisedToast(ativo)`.
   */
  raiseToast: () => () => void;
  openStartSheet: () => void;
  /** Inicia um treino (rotina ou vazio) e avisa o resultado. */
  startWorkout: (routine: Pick<RoutineSummary, "id" | "name"> | null) => void;
  /** Abre o treino em andamento (tela de treino: /treino?id=…). */
  openWorkout: (sessionId: string) => void;
  /**
   * Treino encerrado no servidor (finalização automática ou outro aparelho)? Se sim, descarta o que
   * estiver no aparelho, avisa e leva ao resumo; devolve true. Em andamento ou sem internet: false.
   */
  resolveClosedWorkout: (sessionId: string) => Promise<boolean>;
}

const AppShellContext = createContext<AppShellApi | null>(null);

export function useAppShell(): AppShellApi {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell precisa estar dentro de <AppShell>.");
  return ctx;
}

/** Sobe a pilha de avisos enquanto `raised` (barra de ação fixa no rodapé da tela). */
export function useRaisedToast(raised: boolean) {
  const { raiseToast } = useAppShell();
  useEffect(() => (raised ? raiseToast() : undefined), [raised, raiseToast]);
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
  const [toasts] = useState(() => createToastStore(TOAST_DURATION_MS));
  // Contador: mais de uma barra pode pedir ao mesmo tempo (ex.: seletor aberto sobre o treino).
  const [raisedCount, setRaisedCount] = useState(0);
  const [startOpen, setStartOpen] = useState(false);

  const showToast = toasts.show;
  // Treino encerrado pelo servidor (finalização automática): fecha no aparelho e mostra o resumo.
  const resolveClosedWorkout = useClosedWorkoutWatcher(showToast);
  const raiseToast = useCallback(() => {
    setRaisedCount((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setRaisedCount((n) => n - 1);
    };
  }, []);

  // Iniciando: da criação da sessão até a tela do treino abrir (o overlay cobre também a navegação).
  // Guarda a rota de onde saiu: qualquer troca de rota encerra o overlay; se a navegação não
  // acontecer, ele some sozinho depois de OPENING_TIMEOUT_MS (nunca fica preso na tela).
  const [openingFrom, setOpeningFrom] = useState<string | null>(null);
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  if (openingFrom !== null && pathname !== openingFrom) setOpeningFrom(null);
  useEffect(() => {
    if (openingFrom === null) return;
    const timer = setTimeout(() => setOpeningFrom(null), OPENING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [openingFrom]);
  const startingWorkout = start.isPending || openingFrom !== null;

  const startWorkoutFor = useCallback(
    (routine: Pick<RoutineSummary, "id" | "name"> | null) => {
      setStartOpen(false);
      // Toque repetido enquanto a sessão é criada não inicia outro treino.
      if (start.isPending) return;
      start.mutate(routine?.id ?? null, {
        onSuccess: ({ sessionId }) => {
          setOpeningFrom(pathnameRef.current);
          showToast(routine ? `${routineShortName(routine.name)} iniciado` : "Treino vazio iniciado", { tone: "success", icon: Play });
          router.push(`/treino?id=${encodeURIComponent(sessionId)}`);
        },
        onError: (error) => showToast(error.message, { tone: "error" }),
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
    () => ({
      showToast,
      updateToast: toasts.update,
      dismissToast: toasts.dismiss,
      raiseToast,
      openStartSheet: () => setStartOpen(true),
      startWorkout: startWorkoutFor,
      openWorkout,
      resolveClosedWorkout,
    }),
    [showToast, toasts, raiseToast, startWorkoutFor, openWorkout, setStartOpen, resolveClosedWorkout],
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

  // Aba ativa também nas telas internas dela (ex.: /projetos/detalhe → Projetos). Perfil de outra
  // pessoa (/pessoa) não acende nenhuma aba.
  const tabIndex = TAB_ROUTES.findIndex(
    (t) =>
      t.path === pathname ||
      (t.path && t.path !== "/" && pathname.startsWith(`${t.path}/`)) ||
      t.inner?.some((inner) => pathname === inner || pathname.startsWith(`${inner}/`)),
  );
  // Aba tocada: o indicador desliza no toque, sem esperar a rota trocar. Vale enquanto a rota
  // ainda é a de onde o toque saiu; trocou a rota, manda a aba da rota.
  const [navIntent, setNavIntent] = useState<{ index: number; from: string } | null>(null);
  const navValue = navIntent?.from === pathname ? navIntent.index : tabIndex;
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
    if (tab.path) {
      setNavIntent({ index, from: pathname });
      return router.push(tab.path);
    }
    showToast(`${tab.name} chega em breve`, { tone: "info" });
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

      {/* Pilha de avisos no <body>, acima de telas cheias e folhas (z-65) e abaixo dos diálogos (z-70). */}
      <ScreenPortal>
        <ToastStack
          store={toasts}
          duration={TOAST_DURATION_MS}
          className={cn(
            "fixed inset-x-3 z-[65] mx-auto max-w-[406px]",
            immersive
              ? raisedCount > 0
                ? "bottom-[calc(186px+env(safe-area-inset-bottom))]"
                : "bottom-[calc(114px+env(safe-area-inset-bottom))]"
              : showMiniCard || raisedCount > 0
                ? "bottom-[calc(168px+env(safe-area-inset-bottom))]"
                : "bottom-[calc(92px+env(safe-area-inset-bottom))]",
          )}
        />
      </ScreenPortal>

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
          value={navValue}
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
                subtitle={r.id === suggested?.id ? `Sugerida · ${routineMeta(r.exercises, r.averageDurationSeconds)}` : routineMeta(r.exercises, r.averageDurationSeconds)}
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

      <SavingOverlay open={startingWorkout} title="Iniciando treino" message="Preparando seus exercícios." variant={7} />
    </AppShellContext.Provider>
  );
}
