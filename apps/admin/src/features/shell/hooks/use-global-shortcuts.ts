"use client";

import { useRouter } from "next/navigation";
import { useNavItems } from "@/features/shell/hooks/use-nav-items";
import { useGoToSearch } from "@/features/shell/hooks/use-search-shortcut";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { SHORTCUTS } from "@/shared/helpers/shortcuts";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";

/**
 * Atalhos de qualquer tela: ? abre a ajuda, / vai para a busca de pessoas e 1–9 abrem as áreas do
 * menu na ordem em que aparecem. Desligados no celular (sem teclado físico).
 */
export function useGlobalShortcuts(onHelp: () => void, enabled: boolean) {
  const router = useRouter();
  const goToSearch = useGoToSearch();
  const items = useNavItems();

  const goToArea = (event: KeyboardEvent): boolean => {
    const item = items[Number(event.key) - 1];
    if (!item) return false;
    router.push(withDevState(item.path));
    return true;
  };

  useKeyboardShortcuts(
    [
      { keys: SHORTCUTS.help.keys, onTrigger: onHelp },
      { keys: SHORTCUTS.search.keys, onTrigger: goToSearch },
      { keys: SHORTCUTS.goTo.keys, onTrigger: goToArea },
    ],
    enabled,
  );
}
