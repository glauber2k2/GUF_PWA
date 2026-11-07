import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/shared/components/ds";
import { BOTTOM_BAR_PROPS } from "@/shared/hooks/use-bottom-clearance";

export interface PasswordScreenFrameProps {
  /** Título curto da barra ("Segurança", "Recuperar acesso"); o título grande fica no conteúdo. */
  barTitle: string;
  onBack: () => void;
  /** Barra fixa no rodapé (botão principal na zona do polegar). */
  footer?: ReactNode;
  children: ReactNode;
}

/** Moldura das telas de senha (Claude Design "Recuperar e Alterar Senha"): voltar, título centrado, conteúdo e rodapé fixo. */
export function PasswordScreenFrame({ barTitle, onBack, footer, children }: PasswordScreenFrameProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-fg">
      <header className="sticky top-0 z-[5] box-content grid h-14 grid-cols-[52px_1fr_52px] items-center bg-background/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} variant="ghost" label="Voltar" onClick={onBack} />
        <span className="text-center text-[15px] font-semibold">{barTitle}</span>
        <span aria-hidden="true" />
      </header>
      <div className="flex flex-1 flex-col gap-6 px-5 pt-3 pb-[calc(140px+env(safe-area-inset-bottom))]">{children}</div>
      {footer && (
        <div {...BOTTOM_BAR_PROPS} className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 backdrop-blur-[12px]">
          <div className="mx-auto flex max-w-[430px] flex-col gap-2.5 px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]">{footer}</div>
        </div>
      )}
    </main>
  );
}
