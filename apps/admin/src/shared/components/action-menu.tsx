"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipsis, type LucideIcon } from "lucide-react";
import { cn, Icon, IconButton } from "@guf/ui";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  isDanger?: boolean;
}

interface ActionMenuProps {
  /** Rótulo do botão para leitor de tela ("Ações para Marina"). */
  label: string;
  items: ActionMenuItem[];
}

/** Três pontinhos com uma lista de ações. Esc ou clique fora fecham; o clique não chega à linha de trás. */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  if (items.length === 0) return null;
  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()}>
      <IconButton icon={Ellipsis} label={label} variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div role="menu" className="absolute top-12 right-0 z-30 flex w-64 flex-col rounded-[14px] border border-border-strong bg-surface-elevated p-1.5 shadow-e3">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => choose(item.onSelect)}
              className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-left hover:bg-surface-3", item.isDanger && "text-danger")}
            >
              <Icon icon={item.icon} size={16} className={item.isDanger ? undefined : "text-fg-secondary"} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
