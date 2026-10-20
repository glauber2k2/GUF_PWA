import type { ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/shared/helpers/class-names";

/** "Adicionar exercício" tracejado no fim da lista do treino (abre o seletor de exercícios). */
export function AddExerciseButton({ className, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "flex h-14 flex-none cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong",
        "bg-transparent text-[15px] font-semibold text-fg hover:bg-surface-3",
        "transition-[transform,background-color] duration-150 ease-standard active:scale-[.97] motion-reduce:active:scale-100",
        className,
      )}
    >
      <Plus size={18} aria-hidden="true" />
      Adicionar exercício
    </button>
  );
}
