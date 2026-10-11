"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, Trophy, Undo2, X, type LucideIcon } from "lucide-react";
import type { ToastContent, ToastItem, ToastStore, ToastTone } from "@/lib/toast/toast-store";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";
import { GufLoader } from "./loader";

export type { ToastTone } from "@/lib/toast/toast-store";

interface ToneStyle {
  icon: LucideIcon;
  /** Cor do ícone (e da ação, exceto em "Desfazer"). */
  text: string;
  /** Fundo do quadrado do ícone (16% do tom). */
  tile: string;
  ring: string;
  bar: string;
  action: string;
  effect: "ring" | "shake" | "wiggle" | "pop";
  glow?: boolean;
}

const TONES: Record<ToastTone, ToneStyle> = {
  success: { icon: CircleCheck, text: "text-success", tile: "bg-success/16", ring: "border-success", bar: "bg-success", action: "text-success", effect: "ring" },
  error: { icon: CircleAlert, text: "text-danger", tile: "bg-danger/16", ring: "border-danger", bar: "bg-danger", action: "text-danger", effect: "shake" },
  warning: { icon: TriangleAlert, text: "text-warning", tile: "bg-warning/16", ring: "border-warning", bar: "bg-warning", action: "text-warning", effect: "wiggle" },
  info: { icon: Info, text: "text-info", tile: "bg-info/16", ring: "border-info", bar: "bg-info", action: "text-info", effect: "pop" },
  pr: { icon: Trophy, text: "text-pr-text", tile: "bg-pr/16", ring: "border-pr", bar: "bg-pr", action: "text-pr-text", effect: "ring", glow: true },
  undo: { icon: Undo2, text: "text-fg-secondary", tile: "bg-fg-secondary/16", ring: "border-fg-secondary", bar: "bg-fg-secondary", action: "text-accent-text", effect: "pop" },
  loading: { icon: Info, text: "text-accent-text", tile: "bg-accent-text/16", ring: "border-accent-text", bar: "bg-accent-text", action: "text-accent-text", effect: "pop" },
};

const ICON_EFFECT: Partial<Record<ToneStyle["effect"], string>> = {
  shake: "animate-guf-toast-shake",
  wiggle: "animate-guf-toast-wiggle",
};

export interface ToastProps extends ToastContent {
  /** Botão "Fechar aviso" (sem: o aviso não tem X; "carregando" nunca tem). */
  onClose?: () => void;
  /** Barra de tempo (ms). Sem: sem barra. */
  timer?: number;
  timerPaused?: boolean;
  /** Muda quando o conteúdo é trocado (reinicia ícone, texto e barra). */
  revision?: number;
  /** Entrada do ícone e do texto. Desligar em amostras estáticas. */
  animate?: boolean;
  /** Avisos de trás da pilha recolhida: só o cartão aparece. */
  contentHidden?: boolean;
  /** Altura fixa (px) — usada pela pilha recolhida. */
  height?: number;
  className?: string;
}

/**
 * Aviso curto sobre o resultado de uma ação: quadrado do ícone no tom do tipo, título,
 * mensagem opcional, ação e fechar. O tipo é lido pelo ícone, pela cor e pelo título.
 * Na tela do app, use `useAppShell().showToast` (pilha com tempo, gestos e animações).
 */
export function Toast({
  tone = "info",
  title,
  message,
  icon,
  actionLabel,
  onAction,
  onClose,
  timer,
  timerPaused = false,
  revision = 0,
  animate = true,
  contentHidden = false,
  height,
  className,
}: ToastProps) {
  const t = TONES[tone];
  const loading = tone === "loading";
  const effect = animate ? ICON_EFFECT[t.effect] : undefined;
  // Botões dentro do cartão não iniciam o arrastar da pilha.
  const stop = (e: PointerEvent) => e.stopPropagation();

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      className={cn(
        "relative flex min-h-14 items-center overflow-hidden rounded-[14px] border border-border-strong bg-surface-elevated text-fg shadow-e3",
        className,
      )}
      style={height === undefined ? undefined : { height }}
    >
      <div
        data-toast-row=""
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-1.5 pl-2.5 transition-opacity duration-200",
          loading && "pr-4",
          contentHidden && "opacity-0",
        )}
      >
        <div
          key={`t${revision}`}
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-[10px]",
            t.text,
            t.tile,
            animate && (t.glow ? "animate-guf-toast-pop-glow" : "animate-guf-toast-pop"),
          )}
        >
          {animate && t.effect === "ring" && (
            <span aria-hidden className={cn("absolute inset-0 rounded-[10px] border-2 animate-guf-toast-ring", t.ring)} />
          )}
          {loading ? (
            <GufLoader variant={4} size={20} tone="brand" label="Carregando" />
          ) : (
            <Icon icon={icon ?? t.icon} size={18} className={effect} />
          )}
        </div>
        <div key={`x${revision}`} className={cn("flex min-w-0 flex-1 flex-col gap-px py-1", animate && "animate-guf-toast-text")}>
          <p className="m-0 text-sm leading-5 font-semibold text-pretty">{title}</p>
          {message && <p className="m-0 text-[13px] leading-[18px] text-pretty text-fg-secondary">{message}</p>}
        </div>
        {actionLabel && (
          <button
            type="button"
            onPointerDown={stop}
            onClick={onAction}
            className={cn("h-11 shrink-0 cursor-pointer rounded-[10px] bg-transparent px-3 text-sm font-bold", t.action)}
          >
            {actionLabel}
          </button>
        )}
        {onClose && !loading && (
          <button
            type="button"
            aria-label="Fechar aviso"
            onPointerDown={stop}
            onClick={onClose}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-transparent text-fg-muted hover:text-fg"
          >
            <Icon icon={X} size={18} />
          </button>
        )}
      </div>
      {timer !== undefined && !loading && (
        <span
          key={`b${revision}`}
          aria-hidden
          className={cn(
            "absolute bottom-0 left-0 h-0.5 w-full origin-left animate-guf-toast-timer opacity-80 motion-reduce:hidden",
            t.bar,
            timerPaused && "[animation-play-state:paused]",
          )}
          style={{ animationDuration: `${timer}ms` }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Avisos visíveis na pilha recolhida. */
const VISIBLE = 3;
/** Recuo de cada nível na pilha recolhida (px) e redução de escala. */
const PEEK = 10;
const SHRINK = 0.05;
/** Espaço entre avisos na pilha expandida (px). */
const GAP = 8;
/** Arrastar além disso (px) dispensa; abaixo, volta com mola. */
const SWIPE_DISMISS = 90;
/** Até aqui (px) o toque conta como toque, não arrasto. */
const TAP_SLOP = 6;
const MIN_HEIGHT = 56;

export interface ToastStackProps {
  store: ToastStore;
  /** Duração do aviso (mesma do store), para a barra de tempo. */
  duration: number;
  /** "bottom": empilha para cima (acima do menu); "top": para baixo. */
  placement?: "bottom" | "top";
  /** Posição da pilha na tela (ex.: fixed + bottom). A pilha tem altura 0 e cresce para fora. */
  className?: string;
}

/**
 * Pilha de avisos: o mais novo na frente, até 3 visíveis (cada nível recua 10 px e 5% de escala).
 * Mouse por cima, foco ou toque expande e pausa o tempo; arrastar para o lado (> 90 px) dispensa.
 */
export function ToastStack({ store, duration, placement = "bottom", className }: ToastStackProps) {
  const { items, paused } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [expandedState, setExpanded] = useState(false);
  const [drag, setDrag] = useState<{ id: number; dx: number } | null>(null);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; type: string; moved: boolean } | null>(null);

  const live = items.filter((t) => t.phase !== "exit");
  const expanded = expandedState && live.length > 0;
  const top = placement === "top";
  const sign = top ? 1 : -1;

  // Pilha expandida ou arrastando: o tempo de todos para.
  const shouldPause = expanded || drag !== null;
  useEffect(() => {
    store.setPaused(shouldPause);
  }, [store, shouldPause]);

  // Altura natural de cada aviso (a linha de conteúdo, que não estica): os de trás da pilha
  // recolhida usam a do da frente; a expandida empilha pela soma das alturas.
  const [observer] = useState(() =>
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) =>
          setHeights((prev) => {
            let next = prev;
            for (const entry of entries) {
              const row = entry.target as HTMLElement;
              const id = Number(row.dataset.toastId);
              const h = Math.max(MIN_HEIGHT, Math.round(row.offsetHeight) + 2);
              if (next[id] !== h) next = { ...next, [id]: h };
            }
            return next;
          }),
        ),
  );
  useEffect(() => () => observer?.disconnect(), [observer]);
  const observe = (id: number) => (el: HTMLDivElement | null) => {
    const row = el?.querySelector<HTMLElement>("[data-toast-row]");
    if (!row || !observer) return;
    row.dataset.toastId = String(id);
    observer.observe(row);
    return () => observer.unobserve(row);
  };

  // Toque fora da pilha recolhe.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expanded]);

  const heightOf = (id: number | undefined) => (id === undefined ? MIN_HEIGHT : (heights[id] ?? MIN_HEIGHT));
  const frontHeight = heightOf(live[0]?.id);
  // Deslocamento de cada aviso na pilha expandida = soma das alturas dos da frente.
  const offsets = live.reduce<number[]>((acc, t, i) => [...acc, i === 0 ? 0 : (acc[i - 1] ?? 0) + heightOf(live[i - 1]?.id) + GAP], []);
  const expandedHeight = live.reduce((sum, t) => sum + heightOf(t.id) + GAP, 0);

  const onPointerDown = (t: ToastItem) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || t.phase === "exit") return;
    pointer.current = { id: t.id, x: e.clientX, type: e.pointerType, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (t: ToastItem) => (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== t.id) return;
    const dx = e.clientX - p.x;
    if (!p.moved && Math.abs(dx) < TAP_SLOP) return;
    p.moved = true;
    setDrag({ id: t.id, dx });
  };
  const onPointerUp = (t: ToastItem) => () => {
    const p = pointer.current;
    if (!p || p.id !== t.id) return;
    pointer.current = null;
    const dx = drag?.id === t.id ? drag.dx : 0;
    setDrag(null);
    if (Math.abs(dx) > SWIPE_DISMISS) return store.dismiss(t.id, Math.sign(dx));
    // Toque (sem arrastar) no celular expande/recolhe; no mouse, o hover já expande.
    if (!p.moved && p.type !== "mouse") setExpanded((v) => !v);
  };
  // O navegador assumiu o gesto (ex.: rolagem vertical): volta para o lugar, sem contar como toque.
  const onPointerCancel = (t: ToastItem) => () => {
    if (pointer.current?.id !== t.id) return;
    pointer.current = null;
    setDrag(null);
  };

  let index = 0;
  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Avisos"
      onPointerEnter={(e) => e.pointerType === "mouse" && setExpanded(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
      }}
      className={cn("pointer-events-none h-0", className)}
    >
      <div className="relative h-0">
        {/* Área invisível da pilha expandida: o mouse passa entre os avisos sem recolher. */}
        {expanded && (
          <div
            aria-hidden
            className={cn("pointer-events-auto absolute inset-x-0", top ? "-top-2" : "-bottom-2")}
            style={{ height: expandedHeight + 2 * GAP }}
          />
        )}
        {items.map((t) => {
          const exiting = t.phase === "exit";
          const i = exiting ? Math.max(0, index - 1) : index++;
          const dragging = drag?.id === t.id;
          const back = !expanded && i > 0;

          let x = dragging ? drag.dx : 0;
          let y = sign * (expanded ? (offsets[i] ?? 0) : i * PEEK);
          let scale = expanded ? 1 : 1 - i * SHRINK;
          let opacity = i < VISIBLE ? 1 : 0;
          if (t.phase === "enter") {
            y -= sign * 80;
            scale = 0.9;
            opacity = 0;
          }
          if (exiting) {
            if (t.exitDir) {
              x = t.exitDir * 420;
            } else {
              y -= sign * 24;
              scale = 0.94;
            }
            opacity = 0;
          }
          if (dragging) opacity = Math.max(0.3, 1 - Math.abs(drag.dx) / 260);

          return (
            <div
              key={t.id}
              ref={observe(t.id)}
              aria-hidden={back || exiting || undefined}
              onPointerDown={onPointerDown(t)}
              onPointerMove={onPointerMove(t)}
              onPointerUp={onPointerUp(t)}
              onPointerCancel={onPointerCancel(t)}
              className={cn(
                "absolute inset-x-0 touch-pan-y select-none",
                top ? "top-0 origin-top" : "bottom-0 origin-bottom",
                exiting ? "pointer-events-none" : "pointer-events-auto",
                dragging
                  ? "cursor-grabbing transition-none"
                  : exiting
                    ? "cursor-grab transition-[transform,opacity] duration-240 ease-exit"
                    : "cursor-grab transition-[transform,opacity] duration-460 ease-toast",
              )}
              style={{
                zIndex: 100 - i,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
              }}
            >
              <Toast
                tone={t.tone}
                title={t.title}
                message={t.message}
                icon={t.icon}
                actionLabel={t.actionLabel}
                onAction={() => store.act(t.id)}
                onClose={() => store.dismiss(t.id)}
                timer={duration}
                timerPaused={paused}
                revision={t.revision}
                contentHidden={back}
                // Recolhida, os de trás ficam com a altura do da frente (só a borda aparece).
                height={back ? frontHeight : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
