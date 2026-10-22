"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PEOPLE_SEARCH_INPUT_ID } from "@/features/shell/constants/nav";
import { withDevState } from "@/shared/helpers/dev-state-path";

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
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable);
      if (event.key !== "/" || typing || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      goToSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, goToSearch]);
}
