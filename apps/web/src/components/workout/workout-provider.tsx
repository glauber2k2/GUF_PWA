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
import { toggleWorkoutPause, workoutElapsedSeconds, type WorkoutClock } from "@guf/core";
import { getSupabaseClient } from "@/lib/supabase";
// Trocar por "@guf/api" na integração com o Supabase (mesma assinatura).
import { setWorkoutPaused } from "@/mocks/workout";

/*
 * Estado do treino em andamento compartilhado pela tela de treino e pelo mini card:
 * relógio (início + pausas) e descanso. Guardado no aparelho (localStorage) para
 * sobreviver a recarregar a página — conveniência local até a migration de pausa
 * (workout_sessions.paused_at / paused_seconds) e o offline com Dexie.
 */

const STORAGE_KEY = "guf.active-workout";
const REST_END_VIBRATION_MS = 200;

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
}

interface WorkoutContextValue {
  active: ActiveWorkoutState | null;
  /** Começa (ou atualiza) o acompanhamento de um treino aberto. */
  track: (workout: { sessionId: string; name: string; clock: WorkoutClock }) => void;
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkoutState) : null;
  } catch {
    return null;
  }
}

function writeStored(state: ActiveWorkoutState | null) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Armazenamento bloqueado (aba anônima etc.): segue só em memória.
  }
}

/** Segundos restantes de descanso agora. */
export function restRemaining(rest: RestState | null, now = Date.now()): number {
  if (!rest) return 0;
  if (rest.endsAt === null) return rest.remainingWhenPaused;
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // ignorar
  }
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveWorkoutState | null>(readStored);
  const listeners = useRef(new Set<() => void>());

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
        vibrate(REST_END_VIBRATION_MS);
        listeners.current.forEach((listener) => listener());
      },
      Math.max(0, restEndsAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [restEndsAt, update]);

  // Ações estáveis (não mudam entre renderizações): seguras como dependência de efeitos.
  const actions = useMemo<Omit<WorkoutContextValue, "active">>(() => {
    const persistPause = (state: ActiveWorkoutState) => {
      void setWorkoutPaused(getSupabaseClient(), {
        sessionId: state.sessionId,
        pausedAt: state.clock.pausedAt,
        pausedSeconds: state.clock.pausedSeconds,
      });
    };
    return {
      track: ({ sessionId, name, clock }) =>
        update((prev) =>
          prev?.sessionId === sessionId ? { ...prev, name } : { sessionId, name, clock, rest: null },
        ),
      clear: () => update(() => null),
      togglePause: () =>
        update((prev) => {
          if (!prev) return prev;
          const clock = toggleWorkoutPause(prev.clock);
          const pausing = clock.pausedAt !== null;
          // Pausar o treino pausa o descanso junto; retomar retoma.
          const rest = prev.rest
            ? pausing
              ? { ...prev.rest, endsAt: null, remainingWhenPaused: restRemaining(prev.rest) }
              : prev.rest.endsAt === null
                ? { ...prev.rest, endsAt: Date.now() + prev.rest.remainingWhenPaused * 1000 }
                : prev.rest
            : null;
          const next = { ...prev, clock, rest };
          persistPause(next);
          return next;
        }),
      startRest: (seconds, next) =>
        update((prev) =>
          prev && seconds > 0
            ? { ...prev, rest: { total: seconds, next, endsAt: Date.now() + seconds * 1000, remainingWhenPaused: seconds } }
            : prev,
        ),
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
    };
  }, [update]);

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

/** Tempo decorrido e descanso restante, atualizados a cada segundo. */
export function useWorkoutClock(active: ActiveWorkoutState | null) {
  const running = Boolean(active && (!active.clock.pausedAt || active.rest?.endsAt));
  const now = useNow(running);
  return {
    elapsed: active ? workoutElapsedSeconds(active.clock, new Date(now)) : 0,
    paused: Boolean(active?.clock.pausedAt),
    restLeft: restRemaining(active?.rest ?? null, now),
  };
}
