"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PEOPLE_SEARCH_INPUT_ID } from "@/features/shell/constants/nav";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";

/** Vai para a busca de pessoas e põe o foco no campo. */
export function useGoToSearch() {
  const router = useRouter();
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  return useCallback(() => {
    const input = document.getElementById(PEOPLE_SEARCH_INPUT_ID);
    if (pathname === "/pessoas" && input) {
      input.focus();
      return;
    }
    router.push(withDevState("/pessoas?foco=1"));
  }, [pathname, router]);
}

/** No computador, "/" leva para a busca (fora de campos de texto). */
export function useSearchShortcut(enabled: boolean) {
  const goToSearch = useGoToSearch();
  useKeyboardShortcuts([{ keys: ["/"], onTrigger: goToSearch }], enabled);
}
