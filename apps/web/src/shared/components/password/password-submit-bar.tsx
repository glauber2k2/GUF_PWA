import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ds";

export interface PasswordSubmitBarProps {
  label: string;
  icon?: LucideIcon;
  isLoading: boolean;
  isDisabled: boolean;
  /** O que falta (ou o que vai acontecer), abaixo do botão. */
  hint: string;
}

/** Botão principal das telas de senha (botão de envio do formulário) e a frase do que falta. */
export function PasswordSubmitBar({ label, icon, isLoading, isDisabled, hint }: PasswordSubmitBarProps) {
  return (
    <>
      <Button type="submit" variant="primary" size="lg" fullWidth icon={isLoading ? undefined : icon} loading={isLoading} disabled={isDisabled && !isLoading}>
        {isLoading ? "Salvando" : label}
      </Button>
      <span aria-live="polite" className="min-h-[18px] text-center text-[13px] leading-[18px] text-fg-muted">
        {hint}
      </span>
    </>
  );
}
