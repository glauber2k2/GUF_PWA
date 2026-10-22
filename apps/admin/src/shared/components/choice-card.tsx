"use client";

import type { ReactNode } from "react";
import { Circle, CircleDot, Lock, type LucideIcon } from "lucide-react";
import { cn, Icon } from "@guf/ui";

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: string;
  icon?: LucideIcon;
  /** Motivo de estar indisponível (mostrado embaixo, com cadeado). */
  disabledReason?: string;
  compact?: boolean;
}

/** Opção de escolha única em cartão (motivo, finalidade, papel, frequência): role radio. */
export function ChoiceCard({ selected, onSelect, title, description, icon, disabledReason, compact = false }: ChoiceCardProps) {
  const disabled = Boolean(disabledReason);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border-[1.5px] text-left text-fg transition-colors duration-150",
        compact ? "min-h-12 items-center px-3.5" : "px-4 py-3.5",
        selected ? "border-accent-text bg-accent/10" : "border-border-strong bg-transparent",
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-surface",
      )}
    >
      <Icon icon={selected ? CircleDot : Circle} size={compact ? 18 : 20} className={cn("flex-none", !compact && "mt-px", selected ? "text-accent-text" : "text-fg-muted")} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="flex items-center gap-1.5 font-semibold">
          {icon && <Icon icon={icon} size={14} />}
          {title}
        </strong>
        {description && <span className="text-[13px] text-fg-secondary">{description}</span>}
        {disabledReason && (
          <span className="flex items-center gap-1.5 text-[13px] text-warning">
            <Icon icon={Lock} size={13} />
            {disabledReason}
          </span>
        )}
      </span>
    </button>
  );
}
