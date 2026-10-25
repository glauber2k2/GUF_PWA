"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Icon } from "@guf/ui";
import { isNavActive } from "@/features/shell/constants/nav";
import { useNavItems } from "@/features/shell/hooks/use-nav-items";
import { Kbd } from "@/shared/components/keyboard-hints";
import { withDevState } from "@/shared/helpers/dev-state-path";

interface NavListProps {
  /** Só ícones (barra lateral recolhida do tablet). */
  compact?: boolean;
  /** Gaveta do celular: itens mais altos. */
  large?: boolean;
  onNavigate?: () => void;
}

/** Itens do menu que o papel pode ver; o atual em volt. No computador, cada um mostra o atalho (1–9). */
export function NavList({ compact = false, large = false, onNavigate }: NavListProps) {
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const items = useNavItems();

  return (
    <ul className={cn("m-0 flex list-none flex-col gap-1 p-0", compact && "items-center")}>
      {items.map((item, index) => {
        const active = isNavActive(item, pathname);
        return (
          <li key={item.path}>
            <Link
              href={withDevState(item.path)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={compact ? item.label : undefined}
              title={compact ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md no-underline transition-colors duration-150 ease-standard",
                compact ? "size-12 justify-center" : cn("gap-3 px-3", large ? "h-13 text-[15px]" : "h-11"),
                active ? "bg-accent/16 font-semibold text-accent-text" : "font-medium text-fg-secondary hover:bg-surface-3 hover:text-fg",
              )}
            >
              <Icon icon={item.icon} size={compact ? 20 : 19} />
              {!compact && <span className="flex-1">{item.label}</span>}
              {!compact && !large && <Kbd className="hidden h-5 min-w-5 bg-transparent text-[11px] font-medium text-fg-muted lg:inline-grid">{String(index + 1)}</Kbd>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
