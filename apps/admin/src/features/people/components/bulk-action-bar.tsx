"use client";

import { Megaphone, X, type LucideIcon } from "lucide-react";
import { cn, Icon } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { ACCOUNT_ACTIONS, BULK_ACTIONS, type AccountActionKind } from "@/features/people/helpers/account-actions";

interface BulkActionBarProps {
  count: number;
  onAction: (kind: AccountActionKind) => void;
  onAnnounce: () => void;
  onClear: () => void;
}

/** neutral = ação comum · caution = muda o acesso (ícone em vermelho) · destructive = não tem volta. */
type TileTone = "neutral" | "caution" | "destructive";

const TILE_STYLES: Record<TileTone, { tile: string; badge: string }> = {
  neutral: { tile: "border-border-strong bg-surface-3 text-fg hover:bg-surface", badge: "bg-accent/14 text-accent-text" },
  caution: { tile: "border-border-strong bg-surface-3 text-fg hover:bg-surface", badge: "bg-danger/14 text-danger" },
  destructive: { tile: "border-danger/30 bg-danger/8 text-danger hover:bg-danger/14", badge: "bg-danger/14" },
};

function toneOf(kind: AccountActionKind): TileTone {
  if (kind === "delete") return "destructive";
  return ACCOUNT_ACTIONS[kind].isDanger ? "caution" : "neutral";
}

interface ActionTileProps {
  label: string;
  icon: LucideIcon;
  tone?: TileTone;
  onClick: () => void;
}

/** Botão quadrado da grade: ícone num ladrilho com a cor da ação e o rótulo embaixo. */
function ActionTile({ label, icon, tone = "neutral", onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border p-2 text-center transition-[transform,background-color] active:scale-[.96] motion-reduce:transition-none",
        TILE_STYLES[tone].tile,
      )}
    >
      <span className={cn("grid size-10 place-items-center rounded-[12px]", TILE_STYLES[tone].badge)}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="text-[12.5px] leading-4 font-semibold text-balance">{label}</span>
    </button>
  );
}

/** Painel preso ao pé da lista com as ações para as pessoas selecionadas (só as que o papel permite). */
export function BulkActionBar({ count, onAction, onAnnounce, onClear }: BulkActionBarProps) {
  const { can } = useStaff();
  const actions = BULK_ACTIONS.filter((kind) => can(ACCOUNT_ACTIONS[kind].permission));

  return (
    <div
      role="region"
      aria-label="Ações para as pessoas selecionadas"
      className="sticky bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20 flex animate-guf-up flex-col gap-3 rounded-xl border border-border-strong bg-surface-elevated p-3 shadow-e3"
    >
      <div className="flex items-center justify-between gap-3 pl-1">
        <span aria-live="polite" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 min-w-7 place-items-center rounded-pill bg-accent px-2 font-display text-base text-accent-foreground tabular-nums">{count}</span>
          {count === 1 ? "pessoa selecionada" : "pessoas selecionadas"}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-fg-secondary hover:bg-surface-3 hover:text-fg"
        >
          <Icon icon={X} size={16} />
          Limpar
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
        {can("draft_announcements") && <ActionTile label="Enviar comunicado" icon={Megaphone} onClick={onAnnounce} />}
        {actions.map((kind) => (
          <ActionTile key={kind} label={ACCOUNT_ACTIONS[kind].label} icon={ACCOUNT_ACTIONS[kind].icon} tone={toneOf(kind)} onClick={() => onAction(kind)} />
        ))}
      </div>
    </div>
  );
}
