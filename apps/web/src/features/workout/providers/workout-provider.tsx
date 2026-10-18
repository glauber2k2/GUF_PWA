"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isWorkoutPaused, toggleWorkoutPause, workoutElapsedSeconds, type WorkoutClock } from "@guf/core";
import { keepScreenOnPreference, useScreenWakeLock } from "@/shared/hooks/use-screen-wake-lock";
import { enqueue } from "@/shared/offline/outbox";
import { playRestAlert, primeRestAlert } from "@/shared/sound/rest-alert";

/*
 * Estado do treino em andamento compartilhado pela tela de treino e pelo mini card:
 * relógio (períodos ativos, como workout_active_periods) e descanso.
 * Pausar/retomar muda o relógio na hora e entra na fila offline com o horário real.
 * O localStorage é só cache para abrir rápido; a fonte é o banco (sincronizado pelo AppShell).
 */

export const ACTIVE_WORKOUT_STORAGE_KEY = "guf.active-workout";

export interface RestState {
  total: number;
  /** "Próx.: Puxada frontal 65 × 8" */
  next: string;
  /** Fim do descanso (ms) quando rodando; null quando pausado. */
  endsAt: number | null;
  /** Segundos restantes guardados quando o descanso está pausado. */
  remainingWhenPaused: number;
}

export interface ActiveWorkoutState {
  sessionId: string;
  name: string;
  clock: WorkoutClock;
  rest: RestState | null;
  /** false = modo de demonstração (não grava no banco). */
  persist: boolean;
}

interface TrackInput {
  sessionId: string;
  name: string;
  clock: WorkoutClock;
  persist?: boolean;
}

interface WorkoutContextValue {
  active: ActiveWorkoutState | null;
  /**
   * Acompanha um treino aberto. Mesmo treino já acompanhado: mantém o relógio local
   * (ele tem as pausas mais recentes, inclusive as ainda na fila offline).
   */
  track: (workout: TrackInput) => void;
  clear: () => void;
  togglePause: () => void;
  startRest: (seconds: number, next: string) => void;
  adjustRest: (deltaSeconds: number) => void;
  toggleRestPause: () => void;
  skipRest: () => void;
  /** Avisa quando um descanso termina sozinho (para o toast "Descanso concluído"). */
  onRestEnd: (listener: () => void) => () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function readStored(): ActiveWorkoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ActiveWorkoutState) : null;
    // Formato antigo (antes dos períodos ativos) é descartado.
    return parsed && Array.isArray(parsed.clock?.periods) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(state: ActiveWorkoutState | null) {
  try {
    if (state) window.localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
  } catch {
    // Armazenamento bloqueado (aba anônima etc.): segue só em memória.
  }
}

/** Apaga o cache do treino ativo (ao sair da conta). */
export function clearActiveWorkoutCache() {
  writeStored(null);
}

/** Segundos restantes de descanso agora. */
export function restRemaining(rest: RestState | null, now = Date.now()): number {
  if (!rest) return 0;
  if (rest.endsAt === null) return rest.remainingWhenPaused;
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveWorkoutState | null>(readStored);
  const listeners = useRef(new Set<() => void>());
  const [keepScreenOn] = keepScreenOnPreference.use();

  // Tela ligada enquanto houver treino em andamento (opção do Perfil).
  useScreenWakeLock(active !== null && keepScreenOn === "on");

  const update = useCallback((fn: (prev: ActiveWorkoutState | null) => ActiveWorkoutState | null) => {
    setActive((prev) => {
      const next = fn(prev);
      writeStored(next);
      return next;
    });
  }, []);

  // Fim do descanso agendado para o horário exato (sem relógio global a cada segundo).
  const restEndsAt = active?.rest?.endsAt ?? null;
  useEffect(() => {
    if (restEndsAt === null) return;
    const timer = setTimeout(
      () => {
        update((prev) => (prev ? { ...prev, rest: null } : prev));
        // Som ou nada, conforme a preferência do Perfil.
        playRestAlert();
        listeners.current.forEach((listener) => listener());
      },
      Math.max(0, restEndsAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [restEndsAt, update]);

  // Ações estáveis (não mudam entre renderizações): seguras como dependência de efeitos.
  const actions = useMemo<Omit<WorkoutContextValue, "active">>(
    () => ({
      track: ({ sessionId, name, clock, persist = true }) =>
        update((prev) =>
          prev?.sessionId === sessionId ? { ...prev, name, persist } : { sessionId, name, clock, rest: null, persist },
        ),
      clear: () => update(() => null),
      togglePause: () => {
        const at = new Date();
        update((prev) => {
          if (!prev) return prev;
          const pausing = !isWorkoutPaused(prev.clock);
          const clock = toggleWorkoutPause(prev.clock, at);
          if (prev.persist) {
            void enqueue({ kind: pausing ? "pause" : "resume", sessionId: prev.sessionId, at: at.toISOString() });
          }
          // Pausar o treino pausa o descanso junto; retomar retoma.
          const rest = prev.rest
            ? pausing
              ? { ...prev.rest, endsAt: null, remainingWhenPaused: restRemaining(prev.rest) }
              : prev.rest.endsAt === null
                ? { ...prev.rest, endsAt: Date.now() + prev.rest.remainingWhenPaused * 1000 }
                : prev.rest
            : null;
          return { ...prev, clock, rest };
        });
      },
      startRest: (seconds, next) => {
        // Roda no toque que inicia o descanso: libera o áudio para o som do fim.
        if (seconds > 0) primeRestAlert();
        update((prev) =>
          prev && seconds > 0
            ? { ...prev, rest: { total: seconds, next, endsAt: Date.now() + seconds * 1000, remainingWhenPaused: seconds } }
            : prev,
        );
      },
      adjustRest: (delta) =>
        update((prev) => {
          if (!prev?.rest) return prev;
          const remaining = Math.max(1, restRemaining(prev.rest) + delta);
          const total = Math.max(prev.rest.total, remaining);
          return prev.rest.endsAt === null
            ? { ...prev, rest: { ...prev.rest, total, remainingWhenPaused: remaining } }
            : { ...prev, rest: { ...prev.rest, total, endsAt: Date.now() + remaining * 1000 } };
        }),
      toggleRestPause: () =>
        update((prev) => {
          if (!prev?.rest) return prev;
          return prev.rest.endsAt === null
            ? { ...prev, rest: { ...prev.rest, endsAt: Date.now() + prev.rest.remainingWhenPaused * 1000 } }
            : { ...prev, rest: { ...prev.rest, endsAt: null, remainingWhenPaused: restRemaining(prev.rest) } };
        }),
      skipRest: () => update((prev) => (prev ? { ...prev, rest: null } : prev)),
      onRestEnd: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [update],
  );

  const value = useMemo<WorkoutContextValue>(() => ({ active, ...actions }), [active, actions]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useActiveWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useActiveWorkout precisa estar dentro de <WorkoutProvider>.");
  return ctx;
}

/** Re-renderiza a cada `intervalMs` enquanto `active` (para relógios ao vivo). */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}

/** Tempo efetivo, pausa e descanso restante, atualizados a cada segundo. */
export function useWorkoutClock(active: ActiveWorkoutState | null) {
  const paused = active ? isWorkoutPaused(active.clock) : false;
  const running = Boolean(active && (!paused || active.rest?.endsAt));
  const now = useNow(running);
  return {
    elapsed: active ? workoutElapsedSeconds(active.clock, new Date(now)) : 0,
    paused,
    restLeft: restRemaining(active?.rest ?? null, now),
  };
}
