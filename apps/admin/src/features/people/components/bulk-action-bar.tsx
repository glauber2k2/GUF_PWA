"use client";

import { Megaphone, X } from "lucide-react";
import { Button, IconButton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { ACCOUNT_ACTIONS, BULK_ACTIONS, type AccountActionKind } from "@/features/people/helpers/account-actions";

interface BulkActionBarProps {
  count: number;
  onAction: (kind: AccountActionKind) => void;
  onAnnounce: () => void;
  onClear: () => void;
}

/** Barra presa ao pé da lista com as ações para as pessoas selecionadas (só as que o papel permite). */
export function BulkActionBar({ count, onAction, onAnnounce, onClear }: BulkActionBarProps) {
  const { can } = useStaff();
  const actions = BULK_ACTIONS.filter((kind) => can(ACCOUNT_ACTIONS[kind].permission));

  return (
    <div
      role="region"
      aria-label="Ações para as pessoas selecionadas"
      className="sticky bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 rounded-xl border border-border-strong bg-surface-elevated p-2.5 shadow-e3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-live="polite" className="mr-auto flex items-center gap-1 font-semibold">
          <IconButton icon={X} label="Limpar seleção" variant="ghost" onClick={onClear} />
          {count === 1 ? "1 selecionada" : `${count} selecionadas`}
        </span>
        <div className="flex max-w-full gap-2 overflow-x-auto">
          {can("draft_announcements") && (
            <Button variant="secondary" icon={Megaphone} onClick={onAnnounce} className="flex-none">
              Enviar comunicado
            </Button>
          )}
          {actions.map((kind) => (
            <Button key={kind} variant={ACCOUNT_ACTIONS[kind].isDanger ? "danger" : "secondary"} icon={ACCOUNT_ACTIONS[kind].icon} onClick={() => onAction(kind)} className="flex-none">
              {ACCOUNT_ACTIONS[kind].label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
