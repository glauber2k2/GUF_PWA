"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { m } from "motion/react";
import { Button, GufRat, ScreenPortal } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import type { TourStep } from "@/features/onboarding/constants/tour-steps";
import { useTargetRect, type TargetRect } from "@/features/onboarding/hooks/use-target-rect";
import { placeBubble } from "@/features/onboarding/helpers/bubble-placement";
import { WorkoutTourStage } from "./workout-tour-stage";

/** Raio do recorte (mesmo do rounded-lg dos cartões). */
const CUTOUT_RADIUS_PX = 16;
const CUTOUT_TRANSITION = { type: "spring", stiffness: 320, damping: 34 } as const;
/** Metade do lado do quadrado girado que forma a seta do balão. */
const ARROW_HALF_PX = 7;

interface TourOverlayProps {
  step: TourStep;
  /** Posição do passo (1…total). */
  position: number;
  total: number;
  onNext: () => void;
  /** Ausente no primeiro passo. */
  onBack?: () => void;
  onSkip: () => void;
}

/** Sem alvo, o recorte encolhe até o centro da tela (escurece tudo). */
function centerRect(viewport: { width: number; height: number }): TargetRect {
  return { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 };
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Tamanho da janela como texto (valor estável para o useSyncExternalStore). */
function useViewport(): { width: number; height: number } {
  const size = useSyncExternalStore(
    subscribeResize,
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => "0x0",
  );
  const [width = 0, height = 0] = size.split("x").map(Number);
  return { width, height };
}

/**
 * Camada do tour (acima de folhas, diálogos e avisos): escurece a tela com um recorte no alvo,
 * anel volt em volta e um balão de fala ao lado do destaque, com seta apontando para ele (abaixo
 * se couber, senão acima), sem cobrir o que está sendo mostrado. Passos do treino desenham a
 * demonstração por baixo. Bloqueia toques na tela: avança só pelos botões; Esc pula.
 * Renderizada no <body> e só no navegador (mede a janela).
 */
export function TourOverlay(props: TourOverlayProps) {
  return (
    <ScreenPortal>
      <TourLayer {...props} />
    </ScreenPortal>
  );
}

function TourLayer({ step, position, total, onNext, onBack, onSkip }: TourOverlayProps) {
  const rect = useTargetRect(step.id, step.target);
  const viewport = useViewport();
  const cutout = rect ?? centerRect(viewport);
  const maskId = useId();
  const titleId = useId();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleSize, setBubbleSize] = useState<{ stepId: string; width: number; height: number } | null>(null);
  const measured = bubbleSize?.stepId === step.id ? bubbleSize : null;
  const placement = measured ? placeBubble(rect, measured, viewport) : null;
  const isLast = position === total;

  // Tamanho do balão (o texto de cada passo tem altura diferente) para escolher o lado.
  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const observer = new ResizeObserver(() =>
      setBubbleSize({ stepId: step.id, width: bubble.offsetWidth, height: bubble.offsetHeight }),
    );
    observer.observe(bubble);
    return () => observer.disconnect();
  }, [step.id]);

  useEffect(() => {
    bubbleRef.current?.focus();
  }, [step.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-[80] touch-none">
      {step.stage === "workout" && <WorkoutTourStage />}

      <svg aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <m.rect
              fill="black"
              rx={CUTOUT_RADIUS_PX}
              initial={false}
              animate={{ x: cutout.left, y: cutout.top, width: cutout.width, height: cutout.height }}
              transition={CUTOUT_TRANSITION}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" mask={`url(#${maskId})`} className="fill-scrim" />
      </svg>

      {rect && (
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-lg ring-2 ring-accent"
          initial={false}
          animate={{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }}
          transition={CUTOUT_TRANSITION}
        />
      )}

      <div
        ref={bubbleRef}
        key={step.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute top-0 left-0 flex w-[min(380px,calc(100vw-24px))] flex-col gap-2.5 rounded-xl bg-surface-elevated p-3.5 shadow-e3 outline-none",
          placement ? "animate-guf-rise-fast" : "invisible",
        )}
        // Posição calculada a cada medida do alvo (valor dinâmico).
        style={placement ? { top: placement.top, left: placement.left } : undefined}
      >
        {placement?.side && (
          <span
            aria-hidden="true"
            className={cn("absolute size-3.5 rotate-45 bg-surface-elevated", placement.side === "below" ? "-top-[7px]" : "-bottom-[7px]")}
            style={{ left: placement.arrowX - ARROW_HALF_PX }}
          />
        )}
        <div className="relative flex items-center gap-2.5">
          <GufRat occasion={step.rat ?? "tip"} size={52} className="flex-none" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs leading-4 font-semibold text-fg-muted tabular-nums">
              {step.chapter} · {position} de {total}
            </span>
            <h2 id={titleId} className="m-0 text-[17px] leading-[22px] font-bold tracking-[-0.01em]">
              {step.title}
            </h2>
          </div>
        </div>
        <p className="relative m-0 text-sm leading-5 text-pretty text-fg-secondary">{step.body}</p>
        <div className="relative flex items-center gap-2">
          {!isLast && (
            <Button variant="ghost" size="tall" onClick={onSkip}>
              Pular
            </Button>
          )}
          <span className="flex-1" />
          {onBack && (
            <Button variant="secondary" size="tall" onClick={onBack}>
              Voltar
            </Button>
          )}
          <Button variant="primary" size="tall" onClick={onNext} className="min-w-[104px]">
            {isLast ? "Começar" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
