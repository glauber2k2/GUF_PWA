"use client";

import type { ReactNode } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Movimento com Motion (motion/react), para o que os keyframes CSS não fazem bem:
 * saída de itens, reposicionamento da lista (layout) e abrir/fechar com altura.
 * Entradas simples continuam nos keyframes do design system (animate-guf-*).
 * Durações e curvas iguais aos tokens de styles/tokens/motion.css.
 * Movimento reduzido: MotionConfig reducedMotion="user" desliga deslocamentos e mantém só opacidade.
 */

export const MOTION_EASE = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
} as const;

/** Segundos (tokens --duration-*). */
export const MOTION_DURATION = { fast: 0.15, base: 0.2, moderate: 0.25, screen: 0.3 } as const;

/** Reposicionamento de itens de lista (reordenar, item que entra ou sai ao lado). */
export const LAYOUT_TRANSITION: Transition = { duration: MOTION_DURATION.moderate, ease: MOTION_EASE.standard };

/** Provider global: carrega os recursos de animação uma vez e respeita o movimento reduzido. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={LAYOUT_TRANSITION}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

/** Conteúdo que abre e fecha com a altura animada (ex.: séries de um exercício). */
export function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          key="collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: { duration: MOTION_DURATION.moderate, ease: MOTION_EASE.standard },
              opacity: { duration: MOTION_DURATION.base, delay: 0.05 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: MOTION_DURATION.base, ease: MOTION_EASE.standard },
              opacity: { duration: MOTION_DURATION.fast },
            },
          }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Linha que entra e sai abrindo/fechando a altura (ex.: série adicionada, removida ou desfeita).
 * Usar dentro de <AnimatePresence initial={false}> com key estável.
 */
export function PresenceRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0, transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE.standard } }}
      transition={{ duration: MOTION_DURATION.moderate, ease: MOTION_EASE.standard }}
      className={cn("overflow-hidden", className)}
    >
      {children}
    </m.div>
  );
}

/**
 * Item de lista que desliza para a nova posição quando a ordem muda e some suavemente ao sair.
 * A entrada fica com o keyframe do próprio item (animate-guf-rise…), por isso não há `initial`.
 * Usar dentro de <AnimatePresence initial={false} mode="popLayout">.
 */
export const LayoutItem = m.div;

/** Props padrão do LayoutItem: posição animada e saída discreta. */
export const LAYOUT_ITEM_PROPS = {
  layout: "position",
  exit: { opacity: 0, scale: 0.97, transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE.exit } },
} as const;

export { AnimatePresence };
