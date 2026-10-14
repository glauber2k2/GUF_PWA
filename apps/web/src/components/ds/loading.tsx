"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { GufLoader, type GufLoaderVariant } from "./loader";
import { ScreenPortal } from "./portal";

/**
 * Início (no relógio do documento) das animações da abertura. A tela de abertura é montada várias
 * vezes em sequência (fallback do Suspense → guarda de sessão → AppShell esperando os dados) e cada
 * montagem nova reiniciaria a animação do zero ("pulo"). A primeira guarda o início; as seguintes
 * herdam o mesmo, e a animação continua de onde estava.
 */
let openingStart: CSSNumberish | null = null;

function useContinuousAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getAnimations !== "function") return;
    const animations = el.getAnimations({ subtree: true });
    if (openingStart !== null) {
      for (const animation of animations) animation.startTime = openingStart;
      return;
    }
    // Primeira abertura: o início só existe depois que a animação começa de fato.
    void Promise.all(animations.map((a) => a.ready))
      .then(() => {
        openingStart ??= animations[0]?.startTime ?? null;
      })
      .catch(() => {
        // Animação cancelada (a tela saiu antes de começar): a próxima vira a referência.
      });
  }, []);
  return ref;
}

/** Trava a rolagem do documento enquanto a tela de abertura estiver montada (nada atrás dela rola). */
function useLockDocumentScroll(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [active]);
}

export interface LoadingScreenProps {
  /** Frase abaixo da logo animada. */
  message?: string;
  /** "screen": tela inteira (app) · "container": dentro do pai (vitrine). */
  placement?: "screen" | "container";
  className?: string;
}

/**
 * Abertura do app: logo completa animada (09 Sonar) + mensagem + "Evolução fitness" no rodapé.
 * Usada enquanto a sessão e os dados do usuário carregam.
 */
export function LoadingScreen({ message = "Preparando seu treino", placement = "screen", className }: LoadingScreenProps) {
  const ref = useContinuousAnimation();
  useLockDocumentScroll(placement === "screen");
  return (
    <div
      ref={ref}
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-7 overflow-hidden bg-background",
        // Fixa na tela: os anéis do Sonar (scale) e a barra do navegador não geram rolagem.
        placement === "screen" ? "fixed inset-0 overscroll-none" : "absolute inset-0",
        className,
      )}
    >
      <GufLoader variant={9} size={76} wordmark label={`Abrindo o guf. ${message}`} />
      <span className="text-[15px] leading-5 text-fg-secondary">{message}</span>
      <span className="absolute inset-x-0 bottom-[calc(48px+env(safe-area-inset-bottom))] text-center text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
        Evolução fitness
      </span>
    </div>
  );
}

export interface SavingOverlayProps {
  open?: boolean;
  title?: string;
  message?: string;
  /** Animação do GufLoader (padrão 7, Ponto saltitante). */
  variant?: GufLoaderVariant;
  /** "screen": sobre a tela inteira, por portal no <body> · "container": dentro do pai (vitrine). */
  placement?: "screen" | "container";
}

/** Bloqueia a tela enquanto algo importante é gravado (ex.: "Salvando treino"). */
export function SavingOverlay({
  open = true,
  title = "Salvando treino",
  message = "Leva só um instante.",
  variant = 7,
  placement = "screen",
}: SavingOverlayProps) {
  if (!open) return null;
  const screen = placement === "screen";
  const overlay = (
    <div className={cn("inset-0 flex items-center justify-center bg-scrim p-6", screen ? "fixed z-[70]" : "absolute z-40")}>
      <div
        role="alertdialog"
        aria-label={title}
        aria-busy="true"
        className="flex w-[260px] animate-guf-pop-in flex-col items-center gap-3.5 rounded-xl bg-surface-elevated px-6 pt-7 pb-6 text-center shadow-e3"
      >
        <GufLoader variant={variant} size={64} label={title} />
        <strong className="text-[17px] leading-[22px]">{title}</strong>
        <span className="text-sm leading-5 text-fg-secondary">{message}</span>
      </div>
    </div>
  );
  return screen ? <ScreenPortal>{overlay}</ScreenPortal> : overlay;
}
