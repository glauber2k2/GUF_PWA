import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Topo do cadastro em passos: voltar, "1 de 3", Pular e a barra de progresso em segmentos. */
export function SetupTopBar({
  current,
  total,
  canGoBack,
  onBack,
  onSkip,
}: {
  /** Passo atual (0 = primeiro). */
  current: number;
  total: number;
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-none flex-col gap-2.5 px-3 pt-[calc(12px+env(safe-area-inset-top))]">
      <div className="grid h-12 grid-cols-[56px_1fr_72px] items-center">
        <span className={cn("transition-opacity duration-200 ease-standard", !canGoBack && "pointer-events-none opacity-0")}>
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={onBack} tabIndex={canGoBack ? undefined : -1} />
        </span>
        <span className="text-center text-[13px] font-semibold text-fg-secondary">
          {Math.min(current + 1, total)} de {total}
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="h-11 cursor-pointer justify-self-end rounded-md bg-transparent px-3 text-[15px] font-semibold text-fg-secondary hover:bg-surface-3 hover:text-fg"
        >
          Pular
        </button>
      </div>
      <div role="progressbar" aria-label="Progresso do cadastro" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current + 1} className="grid grid-cols-3 gap-1.5 px-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1 overflow-hidden rounded-pill bg-surface-3">
            <span
              className={cn("block h-full rounded-pill bg-accent transition-[width] duration-450 ease-standard motion-reduce:transition-none", i <= current ? "w-full" : "w-0")}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
