import type { ReactNode } from "react";

/** Barra de ações fixa no rodapé, só no celular (ação principal na zona do polegar). */
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-background/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur-md md:hidden">
      {children}
    </div>
  );
}
