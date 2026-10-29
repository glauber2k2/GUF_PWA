"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { routineShortName, toLocalISODate } from "@guf/core";
import type { RoutineSummary } from "@guf/api";
import { BOTTOM_NAV_ITEMS, BottomNav, LoadingScreen, SavingOverlay, ScreenPortal, ToastStack, type NavBadge, type NavItem } from "@/shared/components/ds";
import { useDevHomeState } from "@/features/home";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { BOTTOM_BAR_PROPS, useBottomClearance } from "@/shared/hooks/use-bottom-clearance";
import { useHomeSummary, useStartWorkout } from "@/features/home";
import { hasPendingFor, isClosedLocally } from "@/shared/offline/outbox";
import { createToastStore, TOAST_DURATION_MS, type ToastOptions } from "@/store/global/toast.store";
import { useNavAlerts, type NavAlert, type NavAlertTab } from "@/store/global/nav-alerts.store";
import { cn } from "@/shared/helpers/class-names";
import { MiniWorkoutCard } from "@/features/workout";
import { newRoutinePathFor } from "@/features/projects";
import { useActiveWorkout } from "@/features/workout";
import { useClosedWorkoutWatcher } from "@/features/app-shell/hooks/use-closed-workout-watcher";
import { StartWorkoutSheet } from "@/features/app-shell/components/start-workout/start-workout-sheet";
import { TOUR_TARGETS } from "@/features/onboarding";

/** Telas cheias (com o próprio cabeçalho/rodapé), sem menu inferior. */
const IMMERSIVE_ROUTES = new Set(["/treino", "/rotina", "/treino/resumo", "/treino/editar", "/pessoa/treino", "/exercicio", "/exercicio/busca", "/planos", "/projetos/importar", "/medidas", "/medidas/musculo", "/medidas/registrar", "/competicao/extrato", "/perfil/editar", "/bem-vindo"]);

/** Rotas de cada aba (índice do BottomNav) e das telas internas que mantêm a aba acesa. */
const TAB_ROUTES: Array<{ path: string | null; name: string; inner?: string[] }> = [
  { path: "/", name: "Início" },
  { path: "/competicao", name: "Competir", inner: ["/buscar-pessoas"] },
  { path: null, name: "Treinar" },
  { path: "/projetos", name: "Projetos" },
  { path: "/perfil", name: "Perfil", inner: ["/configuracoes", "/seguidores", "/solicitacoes"] },
];

/**
 * Abas destacadas pelo tour de onboarding (data-tour). Montado na renderização, não na carga do
 * módulo: app-shell, workout e onboarding se importam em ciclo e a constante ainda pode não existir.
 */
function buildNavItems(): NavItem[] {
  const targets: Record<string, string> = {
    Competir: TOUR_TARGETS.competeTab,
    Treinar: TOUR_TARGETS.trainTab,
    Projetos: TOUR_TARGETS.projectsTab,
    Perfil: TOUR_TARGETS.profileTab,
  };
  return BOTTOM_NAV_ITEMS.map((item) => ({ ...item, tourTarget: targets[item.label] }));
}

/** Rótulo do item do menu de cada aba que pode ter alerta. */
const ALERT_TAB_LABELS: Record<NavAlertTab, string> = { profile: "Perfil" };

/** Junta os textos dos alertas de uma aba no indicador do item. */
function toNavBadge(alerts: readonly NavAlert[]): NavBadge {
  return { label: alerts.map((a) => a.label).join(", ") };
}

/** Itens do menu com a bolinha das abas que têm alerta publicado (quem publica são as features). */
function useNavItemsWithAlerts(items: NavItem[]): NavItem[] {
  const alerts = useNavAlerts();
  return useMemo(() => {
    const badges = new Map<string, NavBadge>();
    for (const [tab, list] of alerts) badges.set(ALERT_TAB_LABELS[tab], toNavBadge(list));
    return items.map((item) => ({ ...item, badge: badges.get(item.label) }));
  }, [items, alerts]);
}

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
  /** Mini card do treino em andamento visível acima do menu (botões flutuantes sobem para não cobri-lo). */
  isMiniCardVisible: boolean;
  /**
   * Hora de não interromper: tela imersiva (treino, edição, resumo…), treino em andamento ou a
   * abertura ainda carregando. Avisos que cobrem a tela (comunicados) esperam.
   */
  isBusy: boolean;
}

const AppShellContext = createContext<AppShellApi | null>(null);

export function useAppShell(): AppShellApi {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell precisa estar dentro de <AppShell>.");
  return ctx;
}

/** Espaço entre a pilha de avisos e a barra de baixo (ou a borda da tela, sem barra). */
const TOAST_GAP_PX = 16;

function toastBottom(clearancePx: number): string {
  return clearancePx > 0 ? `${clearancePx + TOAST_GAP_PX}px` : `calc(${TOAST_GAP_PX}px + env(safe-area-inset-bottom))`;
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
  // A pilha fica acima da barra fixa mais alta do rodapé (menu, mini card, "Salvar", descanso…), medida na tela.
  const bottomClearance = useBottomClearance();
  const [startOpen, setStartOpen] = useState(false);
  const [baseNavItems] = useState(buildNavItems);
  const navItems = useNavItemsWithAlerts(baseNavItems);

  const showToast = toasts.show;
  // Treino encerrado pelo servidor (finalização automática): fecha no aparelho e mostra o resumo.
  const resolveClosedWorkout = useClosedWorkoutWatcher(showToast);

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

  const showMiniCard = Boolean(active) && !immersive;
  const isBusy = immersive || !booted || Boolean(active) || Boolean(summary.data?.inProgress);

  const api = useMemo<AppShellApi>(
    () => ({
      showToast,
      updateToast: toasts.update,
      dismissToast: toasts.dismiss,
      openStartSheet: () => setStartOpen(true),
      startWorkout: startWorkoutFor,
      openWorkout,
      resolveClosedWorkout,
      isMiniCardVisible: showMiniCard,
      isBusy,
    }),
    [showToast, toasts, startWorkoutFor, openWorkout, setStartOpen, resolveClosedWorkout, showMiniCard, isBusy],
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

  // Já treinou hoje: a folha não destaca nenhuma rotina como "Próximo".
  const today = toLocalISODate(new Date());
  const trainedToday = summary.data?.weekSessions.some((s) => s.performedOn === today) ?? false;

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
        {/* Distância do fundo medida na hora (valor dinâmico): acima das barras ou perto da borda. */}
        <div className="fixed inset-x-3 z-[65] mx-auto max-w-[406px]" style={{ bottom: toastBottom(bottomClearance) }}>
          <ToastStack store={toasts} duration={TOAST_DURATION_MS} />
        </div>
      </ScreenPortal>

      {showMiniCard && (
        <div {...BOTTOM_BAR_PROPS} className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[15] mx-auto max-w-[406px]">
          <MiniWorkoutCard onOpen={openWorkout} />
        </div>
      )}

      <div
        {...BOTTOM_BAR_PROPS}
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px]",
          immersive && "hidden",
        )}
      >
        <BottomNav
          items={navItems}
          value={navValue}
          onChange={onNav}
          className="mx-auto max-w-[430px] border-t-0 bg-transparent backdrop-blur-none"
        />
      </div>

      <StartWorkoutSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        inProgress={inProgress}
        hasTrainedToday={trainedToday}
        onResume={openWorkout}
        onStart={startWorkoutFor}
        onCreateRoutine={(projectId) => {
          setStartOpen(false);
          router.push(newRoutinePathFor(projectId));
        }}
      />

      <SavingOverlay open={startingWorkout} title="Iniciando treino" message="Preparando seus exercícios." variant={7} />
    </AppShellContext.Provider>
  );
}
