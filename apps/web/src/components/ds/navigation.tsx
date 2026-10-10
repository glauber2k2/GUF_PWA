"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ClipboardList, Dumbbell, GripVertical, House, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

export interface NavItem {
  label: string;
  icon: LucideIcon;
}

/** Itens do CLAUDE.md: Início, Histórico, Treinar (central), Projetos, Perfil. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Início", icon: House },
  { label: "Histórico", icon: CalendarDays },
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

/** Bottom navigation de 76px; item central volt; ativo com tint volt 16%. */
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
  return (
    <nav
      aria-label="Principal"
      className={cn(
        "grid h-[76px] auto-cols-fr grid-flow-col items-center border-t border-border bg-surface/92 px-1 pb-3 backdrop-blur-[12px]",
        className,
      )}
    >
      {items.map((item, i) => {
        const on = current === i;
        const center = i === centerIndex;
        return (
          <button
            key={item.label}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => {
              setInner(i);
              onChange?.(i);
            }}
            className={cn(
              "grid h-14 cursor-pointer content-center justify-items-center gap-[3px] bg-transparent text-[11px] font-semibold",
              on ? "text-fg" : "text-fg-muted",
            )}
          >
            <span
              className={cn(
                "grid h-8 place-items-center rounded-pill",
                center ? "w-14 bg-accent text-accent-foreground" : "w-12",
                !center && (on ? "bg-accent/16 text-accent-text" : "bg-transparent"),
              )}
            >
              <Icon icon={item.icon} size={20} />
            </span>
            {item.label}
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
