import type { ReactNode } from "react";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { Icon, IconButton } from "@/shared/components/ds";

export interface EditorFrameProps {
  title: string;
  /** Linha acima do título (ex.: o projeto da rotina). */
  projectName?: string;
  onBack: () => void;
  /** Ação no canto direito do cabeçalho (ex.: "Salvar"). */
  action?: ReactNode;
  /** Barra fixa no rodapé, na zona do polegar. */
  bottomBar?: ReactNode;
  children: ReactNode;
}

/** Tela imersiva de edição (rotina, importar ficha): cabeçalho fixo com voltar, conteúdo e barra no rodapé. */
export function EditorFrame({ title, projectName, onBack, action, bottomBar, children }: EditorFrameProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-[5] border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="flex h-14 items-center gap-2 pr-3 pl-1.5">
          <IconButton icon={ChevronLeft} variant="ghost" label="Voltar" onClick={onBack} />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            {projectName && (
              <span className="flex items-center gap-1.5 overflow-hidden text-[11px] leading-4 font-semibold tracking-[0.08em] whitespace-nowrap text-accent-text uppercase">
                <Icon icon={ClipboardList} size={12} />
                <span className="truncate">{projectName}</span>
              </span>
            )}
            <h1 className="m-0 truncate text-lg leading-6 font-semibold tracking-[-0.015em]">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <div className="flex animate-guf-rise flex-col gap-4 px-4 pt-4">{children}</div>
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
          <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">{bottomBar}</div>
        </div>
      )}
    </main>
  );
}
