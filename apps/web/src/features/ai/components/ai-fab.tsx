"use client";

import type { Ref } from "react";
import { cn } from "@/shared/helpers/class-names";
import { AiMark } from "@/shared/components/ai-mark";

interface AiFabProps {
  /** Botão principal (o foco volta para ele quando o painel fecha). */
  ref?: Ref<HTMLButtonElement>;
  isHidden: boolean;
  isHintVisible: boolean;
  /** Mini card do treino em andamento acima do menu: o botão sobe para não cobri-lo. */
  isRaised: boolean;
  onOpen: () => void;
}

/** Botão flutuante do GUF AI na Início (acima do menu), com o balão "Pergunte ao GUF AI" na primeira vez. */
export function AiFab({ ref, isHidden, isHintVisible, isRaised, onOpen }: AiFabProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[16] mx-auto max-w-[430px]",
        isRaised ? "bottom-[calc(170px+env(safe-area-inset-bottom))]" : "bottom-[calc(94px+env(safe-area-inset-bottom))]",
      )}
    >
      {isHintVisible && !isHidden && (
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto absolute right-[88px] bottom-[10px] flex h-9 animate-guf-ai-hint cursor-pointer items-center rounded-pill border border-border bg-surface-elevated px-3.5 text-[13px] font-semibold whitespace-nowrap text-fg shadow-e3"
        >
          Pergunte ao GUF AI
        </button>
      )}
      <button
        ref={ref}
        type="button"
        aria-label="Abrir GUF AI"
        aria-haspopup="dialog"
        onClick={onOpen}
        tabIndex={isHidden ? -1 : undefined}
        className={cn(
          "pointer-events-auto absolute right-[18px] bottom-0 grid size-14 cursor-pointer place-items-center rounded-pill bg-accent text-accent-foreground shadow-e3",
          "transition-[transform,opacity,filter] duration-300 ease-enter hover:brightness-[1.06] active:scale-[.94]",
          isHidden && "pointer-events-none scale-[.6] opacity-0",
        )}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-guf-ai-halo rounded-pill border-2 border-accent" />
        <AiMark size={34} twinkle />
      </button>
    </div>
  );
}
