import type { LucideIcon } from "lucide-react";

/**
 * Tipo do aviso: lido pelo ícone, pela cor e pelo título (nunca só pela cor).
 * success = ação concluída · error = falha (com saída) · warning = atenção sem bloqueio ·
 * info = explicação neutra · pr = recorde (sempre troféu) · undo = ação reversível ("Desfazer") ·
 * loading = em andamento (não expira; vira outro tipo com `update`).
 */
export type ToastTone = "success" | "error" | "warning" | "info" | "pr" | "undo" | "loading";

export interface ToastContent {
  tone?: ToastTone;
  title: string;
  /** Linha de apoio abaixo do título. */
  message?: string;
  /** Ícone no lugar do padrão do tipo. */
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastOptions extends Omit<ToastContent, "title"> {
  /** O aviso sumiu SEM a ação (tempo, fechar, arrastar ou substituído por outros). */
  onClose?: () => void;
  /** Vibração do tipo (sucesso e recorde). Desligar quando a tela já vibrou. */
  haptic?: boolean;
}

export interface ToastItem extends ToastContent {
  id: number;
  tone: ToastTone;
  /** Muda a cada `update` (reinicia ícone, texto e barra de tempo). */
  revision: number;
  phase: "enter" | "idle" | "exit";
  /** Saída arrastada: -1 esquerda, 1 direita; 0 = saída normal. */
  exitDir: number;
  onClose?: () => void;
}

export interface ToastSnapshot {
  items: ToastItem[];
  paused: boolean;
}

export interface ToastStore {
  show: (title: string, options?: ToastOptions) => number;
  update: (id: number, title: string, options?: ToastOptions) => void;
  dismiss: (id: number, dir?: number) => void;
  /** Toca a ação do aviso (sem chamar `onClose`). */
  act: (id: number) => void;
  /** Pausa/retoma o tempo de todos (pilha expandida, arrastando). */
  setPaused: (paused: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ToastSnapshot;
  getServerSnapshot: () => ToastSnapshot;
}

/** Tempo na tela (a barra de progresso acompanha; pausa enquanto a pilha está expandida). */
export const TOAST_DURATION_MS = 5000;
/** Duração da saída (a camada some depois dela). */
export const TOAST_EXIT_MS = 320;
/** Avisos vivos na pilha (3 visíveis + 2 atrás); o mais antigo sai quando chega outro. */
const MAX_LIVE = 5;

const HAPTICS: Partial<Record<ToastTone, number | number[]>> = { success: 15, pr: [20, 40, 20] };

const SERVER_SNAPSHOT: ToastSnapshot = { items: [], paused: false };

function vibrate(pattern: number | number[] | undefined) {
  if (pattern === undefined || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Alguns navegadores bloqueiam a vibração sem gesto do usuário.
  }
}

interface Clock {
  timer: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

/** Pilha de avisos fora do React (o shell não renderiza de novo a cada aviso). */
export function createToastStore(duration = TOAST_DURATION_MS): ToastStore {
  let snapshot: ToastSnapshot = { items: [], paused: false };
  let seq = 0;
  const listeners = new Set<() => void>();
  const clocks = new Map<number, Clock>();

  const commit = (next: Partial<ToastSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((l) => l());
  };
  const find = (id: number) => snapshot.items.find((t) => t.id === id);
  const patch = (id: number, p: Partial<ToastItem>) =>
    commit({ items: snapshot.items.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  const run = (id: number, clock: Clock) => {
    clock.startedAt = Date.now();
    clock.timer = setTimeout(() => dismiss(id), clock.remaining);
  };
  const stopClock = (id: number) => {
    const clock = clocks.get(id);
    if (clock?.timer) clearTimeout(clock.timer);
    clocks.delete(id);
  };
  const startClock = (id: number, tone: ToastTone) => {
    stopClock(id);
    if (tone === "loading") return;
    const clock: Clock = { timer: null, remaining: duration, startedAt: 0 };
    clocks.set(id, clock);
    if (!snapshot.paused) run(id, clock);
  };

  const close = (id: number, dir: number, notify: boolean) => {
    const toast = find(id);
    if (!toast || toast.phase === "exit") return;
    stopClock(id);
    patch(id, { phase: "exit", exitDir: dir });
    if (notify) toast.onClose?.();
    setTimeout(() => commit({ items: snapshot.items.filter((t) => t.id !== id) }), TOAST_EXIT_MS);
  };

  function dismiss(id: number, dir = 0) {
    close(id, dir, true);
  }

  return {
    show(title, options = {}) {
      const { onClose, haptic = true, ...content } = options;
      const tone = content.tone ?? "info";
      const id = ++seq;
      if (haptic) vibrate(HAPTICS[tone]);
      // O mais antigo sai quando a pilha passa do limite.
      snapshot.items
        .filter((t) => t.phase !== "exit")
        .slice(MAX_LIVE - 1)
        .forEach((t) => dismiss(t.id));
      commit({ items: [{ ...content, id, title, tone, revision: 0, phase: "enter", exitDir: 0, onClose }, ...snapshot.items] });
      startClock(id, tone);
      // Dois quadros: o navegador pinta a posição de entrada antes de animar até a pilha.
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (find(id)?.phase === "enter") patch(id, { phase: "idle" });
          }),
        );
      } else {
        patch(id, { phase: "idle" });
      }
      return id;
    },
    update(id, title, options = {}) {
      const toast = find(id);
      if (!toast || toast.phase === "exit") return;
      const { onClose, haptic = true, ...content } = options;
      const tone = content.tone ?? "info";
      if (haptic) vibrate(HAPTICS[tone]);
      patch(id, {
        icon: undefined,
        message: undefined,
        actionLabel: undefined,
        onAction: undefined,
        ...content,
        title,
        tone,
        onClose,
        revision: toast.revision + 1,
      });
      startClock(id, tone);
    },
    dismiss,
    act(id) {
      const toast = find(id);
      if (!toast || toast.phase === "exit") return;
      close(id, 0, false);
      toast.onAction?.();
    },
    setPaused(paused) {
      if (snapshot.paused === paused) return;
      clocks.forEach((clock, id) => {
        if (paused && clock.timer) {
          clearTimeout(clock.timer);
          clock.timer = null;
          clock.remaining = Math.max(0, clock.remaining - (Date.now() - clock.startedAt));
        } else if (!paused && !clock.timer) {
          run(id, clock);
        }
      });
      commit({ paused });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
  };
}
