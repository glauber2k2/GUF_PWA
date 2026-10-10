"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";

const THRESHOLD = 110;
const START_SLOP = 8;
const EXIT_MS = 200;

function vibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    // Alguns navegadores bloqueiam vibração; ignorar.
  }
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface SwipeToDeleteProps {
  onDelete: () => void;
  /** Rótulo da ação ("Remover série"). */
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Arrastar para a esquerda remove o item (ex.: série). Passando de 110px, solta = remove.
 * Rolagem vertical continua livre (touch-action: pan-y). Ao cruzar o limite, vibração curta.
 */
export function SwipeToDelete({ onDelete, label = "Remover", children, className }: SwipeToDeleteProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const swipedAt = useRef(0);
  const armed = dx < -THRESHOLD;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    gesture.current = { x: e.clientX, y: e.clientY, active: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    if (!g.active) {
      if (Math.abs(ddx) > START_SLOP && Math.abs(ddx) > Math.abs(ddy)) {
        g.active = true;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (Math.abs(ddy) > START_SLOP) {
        gesture.current = null;
      }
      if (!g.active) return;
    }
    const next = Math.min(0, ddx);
    if (next < -THRESHOLD !== dx < -THRESHOLD) vibrate(10);
    setDx(next);
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.active) return;
    swipedAt.current = Date.now();
    setDragging(false);
    if (dx < -THRESHOLD) {
      setDx(-400);
      setTimeout(onDelete, reducedMotion() ? 0 : EXIT_MS);
    } else {
      setDx(0);
    }
  };

  const progress = Math.min(1, -dx / THRESHOLD);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        // Evita que o "soltar" do arrasto vire um toque no conteúdo.
        if (Date.now() - swipedAt.current < 350) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      className={cn("relative touch-pan-y overflow-hidden", className)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-2 inset-y-[3px] flex items-center justify-end gap-2.5 rounded-md bg-banner-danger pr-3"
        style={{ opacity: Math.min(1, -dx / 40) }}
      >
        <span className="text-[13px] font-semibold whitespace-nowrap text-danger">
          {armed ? "Solte para remover" : label}
        </span>
        <span
          className={cn(
            "grid size-9 flex-none place-items-center rounded-pill transition-[transform,background-color,color] duration-150 ease-overshoot",
            armed ? "bg-danger text-surface-elevated" : "bg-danger/16 text-danger",
          )}
          style={{ transform: `scale(${armed ? 1.08 : 0.7 + 0.3 * progress})` }}
        >
          <Icon icon={Trash2} size={17} />
        </span>
      </div>
      <div
        className={cn(
          "relative bg-surface-elevated",
          dx < 0 && "rounded-md shadow-e2",
          !dragging && "transition-transform duration-200 ease-standard motion-reduce:transition-none",
        )}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
