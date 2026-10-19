"use client";

import { useEffect, useId, useRef } from "react";
import { m } from "motion/react";
import { Button, GufRat, ScreenPortal } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import type { TourStep } from "@/features/onboarding/constants/tour-steps";
import { useTargetRect, type TargetRect } from "@/features/onboarding/hooks/use-target-rect";

/** Raio do recorte (mesmo do rounded-lg dos cartões). */
const CUTOUT_RADIUS_PX = 16;
const CUTOUT_TRANSITION = { type: "spring", stiffness: 320, damping: 34 } as const;

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
function centerRect(): TargetRect {
  return { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
}

/**
 * Camada do tour (acima de folhas, diálogos e avisos): escurece a tela com um recorte no alvo,
 * anel volt em volta e card com o passo. Bloqueia toques na tela: avança só pelos botões; Esc pula.
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
  const rect = useTargetRect(step.target);
  const cutout = rect ?? centerRect();
  const maskId = useId();
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const isLast = position === total;
  // Alvo na metade de baixo (ex.: menu inferior): o card vai para o topo para não cobri-lo.
  const cardOnTop = rect !== null && rect.top + rect.height / 2 > window.innerHeight / 2;

  useEffect(() => {
    cardRef.current?.focus();
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
        ref={cardRef}
        key={step.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-3 mx-auto flex max-w-[406px] animate-guf-rise-fast flex-col gap-3 rounded-xl bg-surface-elevated p-4 shadow-e3 outline-none",
          cardOnTop ? "top-[calc(12px+env(safe-area-inset-top))]" : "bottom-[calc(12px+env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center gap-3">
          <GufRat occasion={step.rat ?? "tip"} size={64} className="flex-none" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs leading-4 font-semibold text-fg-muted tabular-nums">
              {position} de {total}
            </span>
            <h2 id={titleId} className="m-0 text-lg leading-6 font-bold tracking-[-0.01em]">
              {step.title}
            </h2>
          </div>
        </div>
        <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">{step.body}</p>
        <div className="flex items-center gap-2">
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
          <Button variant="primary" size="tall" onClick={onNext} className="min-w-[112px]">
            {isLast ? "Começar" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
