"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardList, Dumbbell, GripVertical, House, Swords, User, type LucideIcon } from "lucide-react";
import { prefersReducedMotion } from "@/shared/helpers/motion";
import { cn } from "@/shared/helpers/class-names";
import { Icon } from "./brand";

export interface AppHeaderProps {
  title: string;
  /** true = título compacto visível + borda (após rolar); false = título grande aparece abaixo. */
  collapsed?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Header fixo de 52px: fundo 88% + blur. */
export function AppHeader({ title, collapsed = true, leading, trailing, className }: AppHeaderProps) {
  return (
    <div
      className={cn(
        "grid h-[52px] grid-cols-[52px_1fr_52px] items-center border-b bg-background/88 backdrop-blur-[10px]",
        "transition-[border-color] duration-200",
        collapsed ? "border-border" : "border-transparent",
        className,
      )}
    >
      <div className="flex justify-start pl-1">{leading}</div>
      <span
        aria-hidden={!collapsed}
        className={cn(
          "truncate text-center text-base font-semibold transition-opacity duration-200 ease-standard",
          collapsed ? "opacity-100" : "opacity-0",
        )}
      >
        {title}
      </span>
      <div className="flex justify-end pr-1">{trailing}</div>
    </div>
  );
}

/** Título grande da tela (32/38), some ao rolar e dá lugar ao AppHeader compacto. */
export function LargeTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn("mt-0 mb-4 text-[32px] leading-[38px] font-bold tracking-[-0.02em]", className)}>{children}</h1>
  );
}

/** Indicador de novidade num item do menu (bolinha); o texto é lido pelo leitor de tela. */
export interface NavBadge {
  label: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Valor de `data-tour` (elemento destacado pelo tour de onboarding). */
  tourTarget?: string;
  badge?: NavBadge;
}

/** Itens do CLAUDE.md: Início (com o histórico), Competir, Treinar (central), Projetos, Perfil. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Início", icon: House },
  { label: "Competir", icon: Swords },
  { label: "Treinar", icon: Dumbbell },
  { label: "Projetos", icon: ClipboardList },
  { label: "Perfil", icon: User },
];

export interface BottomNavProps {
  items?: NavItem[];
  value?: number;
  defaultValue?: number;
  onChange?: (index: number) => void;
  /** Índice do item central em volt (Treinar). */
  centerIndex?: number;
  className?: string;
}

/** Duração do deslize do indicador entre abas. */
const INDICATOR_MS = 420;
/** No meio do deslize, a borda da frente já andou 75% e a de trás só 20%: o indicador estica e depois alcança. */
const LEAD = 0.75;
const TRAIL = 0.2;

interface IndicatorBox {
  x: number;
  y: number;
  w: number;
}

/** Quadros do deslize "elástico" (Web Animations API): posição pela borda esquerda + largura. */
function stretchKeyframes(from: IndicatorBox, to: IndicatorBox): Keyframe[] {
  const d = to.x - from.x;
  const [left, right] = d > 0 ? [TRAIL, LEAD] : [LEAD, TRAIL];
  const midLeft = from.x + d * left;
  const midRight = from.x + from.w + d * right;
  const frame = (x: number, y: number, w: number, offset: number): Keyframe => ({ transform: `translate(${x}px, ${y}px)`, width: `${w}px`, offset });
  return [
    frame(from.x, from.y, from.w, 0),
    frame(midLeft, (from.y + to.y) / 2, midRight - midLeft, 0.45),
    frame(to.x, to.y, to.w, 1),
  ];
}

/**
 * Indicador da aba ativa (tint volt 16%) que desliza e estica até a aba tocada.
 * Mede o ícone da aba ativa (funciona com qualquer largura) e se ajusta ao redimensionar.
 * Interromper no meio (toques rápidos) parte da posição visível. Movimento reduzido: troca direto.
 * Sem aba ativa (item central ou nav oculto): some.
 */
function useSlidingIndicator(current: number, centerIndex: number) {
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const iconRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;

    const place = (animate: boolean) => {
      const navBox = nav.getBoundingClientRect();
      const target = current === centerIndex ? null : iconRefs.current[current];
      if (!target || navBox.width === 0) {
        pill.style.opacity = "0";
        placed.current = false;
        return;
      }
      // Posição VISÍVEL agora (inclusive no meio de um deslize) antes de cancelar o anterior.
      const seen = pill.getBoundingClientRect();
      const from: IndicatorBox = { x: seen.left - navBox.left, y: seen.top - navBox.top, w: seen.width };
      const box = target.getBoundingClientRect();
      const to: IndicatorBox = { x: box.left - navBox.left, y: box.top - navBox.top, w: box.width };
      const wasPlaced = placed.current;

      pill.getAnimations().forEach((a) => a.cancel());
      pill.style.opacity = "1";
      pill.style.transform = `translate(${to.x}px, ${to.y}px)`;
      pill.style.width = `${to.w}px`;
      placed.current = true;

      if (!animate || !wasPlaced || Math.abs(to.x - from.x) < 1 || prefersReducedMotion()) return;
      pill.animate(stretchKeyframes(from, to), { duration: INDICATOR_MS, easing: "cubic-bezier(0.33, 1, 0.68, 1)" });
    };

    place(true);
    // Tamanho mudou (rotação, nav que estava oculto voltou): reposiciona sem animar. O aviso inicial
    // do observer (mesmo tamanho) é ignorado para não cortar o deslize que acabou de começar.
    let size = `${nav.offsetWidth}x${nav.offsetHeight}`;
    const observer = new ResizeObserver(() => {
      const next = `${nav.offsetWidth}x${nav.offsetHeight}`;
      if (next === size) return;
      size = next;
      place(false);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [current, centerIndex]);

  return { navRef, pillRef, iconRefs };
}

/** Bottom navigation de 76px; item central volt; ativo com tint volt 16% que desliza entre as abas. */
export function BottomNav({
  items = BOTTOM_NAV_ITEMS,
  value,
  defaultValue = 0,
  onChange,
  centerIndex = 2,
  className,
}: BottomNavProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const { navRef, pillRef, iconRefs } = useSlidingIndicator(current, centerIndex);
  return (
    <nav
      ref={navRef}
      aria-label="Principal"
      className={cn(
        "relative grid h-[76px] auto-cols-fr grid-flow-col items-center border-t border-border bg-surface/92 px-1 pb-3 backdrop-blur-[12px]",
        className,
      )}
    >
      {/* Posição e largura definidas pelo hook (valores medidos); os botões (relative) ficam por cima. */}
      <span ref={pillRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-8 rounded-pill bg-accent/16 opacity-0" />
      {items.map((item, i) => {
        const on = current === i;
        const center = i === centerIndex;
        return (
          <button
            key={item.label}
            type="button"
            data-tour={item.tourTarget}
            aria-current={on ? "page" : undefined}
            onClick={() => {
              setInner(i);
              onChange?.(i);
            }}
            className={cn(
              "relative grid h-14 cursor-pointer content-center justify-items-center gap-[3px] bg-transparent text-[11px] font-semibold",
              "transition-colors duration-300 ease-standard",
              on ? "text-fg" : "text-fg-muted",
            )}
          >
            <span
              ref={(el) => {
                iconRefs.current[i] = el;
              }}
              className={cn(
                "relative grid h-8 place-items-center rounded-pill transition-colors duration-300 ease-standard",
                center ? "w-14 bg-accent text-accent-foreground" : "w-12",
                !center && on && "text-accent-text",
              )}
            >
              <Icon icon={item.icon} size={20} />
              {/* accent-text: no tema claro é o verde escuro (contraste 3:1 de elemento gráfico). */}
              {item.badge && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-2.5 size-2.5 animate-guf-pop-in rounded-pill bg-accent-text ring-2 ring-surface motion-reduce:animate-none"
                />
              )}
            </span>
            {item.label}
            {item.badge && <span className="sr-only">, {item.badge.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export interface ReorderItem {
  id: string;
  name: string;
  meta?: string;
}

/** Lista reordenável por arrastar (alça grip, item arrastado elevado). */
export function ReorderList({
  items: initial,
  onReorder,
  className,
}: {
  items: ReorderItem[];
  onReorder?: (items: ReorderItem[]) => void;
  className?: string;
}) {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  return (
    <div className={cn("grid gap-2", className)}>
      {items.map((item, i) => {
        const on = dragging === i;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
              setDragging(i);
            }}
            onDragEnter={() => {
              if (dragging === null || dragging === i) return;
              const next = items.slice();
              const [moved] = next.splice(dragging, 1);
              if (!moved) return;
              next.splice(i, 0, moved);
              setItems(next);
              setDragging(i);
              onReorder?.(next);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => setDragging(null)}
            className={cn(
              "flex h-[60px] cursor-grab items-center gap-2.5 rounded-md border bg-surface-elevated pr-1.5 pl-1",
              "transition-transform duration-150 ease-standard",
              on ? "scale-[1.02] border-accent-text shadow-e3" : "border-border",
            )}
          >
            <span aria-label="Arrastar para reordenar" className="grid size-11 place-items-center text-fg-muted">
              <Icon icon={GripVertical} size={18} />
            </span>
            <span className="w-[18px] font-display text-lg font-semibold text-fg-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{item.name}</span>
            <span className="pr-2.5 text-[13px] text-fg-muted tabular-nums">{item.meta}</span>
          </div>
        );
      })}
    </div>
  );
}
