import { Check } from "lucide-react";
import { PASSWORD_REQUIREMENTS, PASSWORD_STRENGTH_LABELS, passwordStrength, type PasswordStrength } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

const BAR_COUNT = 4;

/** Cor de cada nível (0 = vazio). */
const STRENGTH_TONES: Record<PasswordStrength, { text: string; bar: string }> = {
  0: { text: "text-fg-muted", bar: "bg-fg-muted" },
  1: { text: "text-danger", bar: "bg-danger" },
  2: { text: "text-warning", bar: "bg-warning" },
  3: { text: "text-info", bar: "bg-info" },
  4: { text: "text-success", bar: "bg-success" },
};

/** Barras de força e os requisitos da senha nova, cada um ganhando check ao ser cumprido. */
export function PasswordStrengthPanel({ password, requirementsMet }: { password: string; requirementsMet: boolean[] }) {
  // Com algo digitado, nunca mostra "vazio": a primeira barra acende.
  const level: PasswordStrength = password ? (Math.max(1, passwordStrength(password)) as PasswordStrength) : 0;
  const tone = STRENGTH_TONES[level];
  return (
    <div className="mt-1 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Força da senha</span>
        <span aria-live="polite" className={cn("text-[13px] font-bold transition-colors", tone.text)}>
          {password ? PASSWORD_STRENGTH_LABELS[level] : "Digite a senha"}
        </span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span key={index} className="h-1.5 overflow-hidden rounded-pill bg-surface-3">
            <span
              className={cn("block h-full rounded-pill transition-[width,background-color] duration-300 ease-standard", tone.bar, index < level ? "w-full" : "w-0")}
              // Barras acendem uma depois da outra (atraso escalonado).
              style={{ transitionDelay: `${index * 50}ms` }}
            />
          </span>
        ))}
      </div>
      <ul aria-label="Requisitos da senha" className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2.5 p-0">
        {PASSWORD_REQUIREMENTS.map((requirement, index) => {
          const isMet = requirementsMet[index] ?? false;
          return (
            <li key={requirement.key} className="flex min-w-0 items-center gap-2">
              {isMet ? (
                <span className="grid size-[18px] flex-none animate-guf-pop-badge place-items-center rounded-pill bg-accent text-accent-foreground">
                  <Icon icon={Check} size={11} />
                </span>
              ) : (
                <span className="size-[18px] flex-none rounded-pill border-[1.5px] border-border-strong" />
              )}
              <span className={cn("text-[13px] leading-[18px] transition-colors", isMet ? "text-fg" : "text-fg-muted")}>
                <span className="sr-only">{isMet ? "Cumprido: " : "Falta: "}</span>
                {requirement.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
