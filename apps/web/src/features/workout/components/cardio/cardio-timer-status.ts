import type { CardioTimerPhase } from "@/features/workout/hooks/use-cardio-timer-controls";

/** Texto e cor do estado do cronômetro (o estado é lido pelo texto, nunca só pela cor). */
export const CARDIO_PHASE_STYLES: Record<CardioTimerPhase, { label: (nextSet: number) => string; text: string; dot: string }> = {
  idle: { label: (nextSet) => `Série ${nextSet}`, text: "text-fg-muted", dot: "bg-fg-muted" },
  running: { label: () => "Gravando", text: "text-accent-text", dot: "bg-accent-text animate-guf-live" },
  paused: { label: () => "Pausado", text: "text-warning", dot: "bg-warning" },
};
