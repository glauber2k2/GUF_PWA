"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipsis, UserCog, UserPlus, UserX } from "lucide-react";
import type { StaffRow } from "@guf/api/admin";
import { cn, Icon, IconButton } from "@guf/ui";

interface MemberMenuProps {
  member: StaffRow;
  onChangeRole: () => void;
  onToggleDisabled: () => void;
}

/** Três pontinhos do colaborador: mudar papel e desativar/reativar. Esc ou clique fora fecham. */
export function MemberMenu({ member, onChangeRole, onToggleDisabled }: MemberMenuProps) {
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

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };
  const disabled = member.status === "disabled";

  return (
    <div ref={ref} className="relative">
      <IconButton icon={Ellipsis} label={`Ações para ${member.displayName}`} variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div role="menu" className="absolute top-12 right-0 z-10 flex w-55 flex-col rounded-[14px] border border-border-strong bg-surface-elevated p-1.5 shadow-e3">
          <button type="button" role="menuitem" onClick={() => choose(onChangeRole)} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-left hover:bg-surface-3">
            <Icon icon={UserCog} size={16} className="text-fg-secondary" />
            Mudar papel
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onToggleDisabled)}
            className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-left hover:bg-surface-3", !disabled && "text-danger")}
          >
            <Icon icon={disabled ? UserPlus : UserX} size={16} />
            {disabled ? "Reativar" : "Desativar"}
          </button>
        </div>
      )}
    </div>
  );
}
