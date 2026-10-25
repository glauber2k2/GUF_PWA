import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/class-names";

interface DetailScreenProps {
  children: ReactNode;
  className?: string;
}

/**
 * Moldura das telas internas (resumo, evolução, planos, extrato…): recuo lateral de 16 px e a área
 * segura do fundo. O `DetailHeader` conta com esse recuo (estica o fundo até a borda com -mx-4):
 * tela com `DetailHeader` usa esta moldura, nunca um <main> próprio, para não passar da largura da tela.
 */
export function DetailScreen({ children, className }: DetailScreenProps) {
  return <main className={cn("flex min-w-0 flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom))]", className)}>{children}</main>;
}
