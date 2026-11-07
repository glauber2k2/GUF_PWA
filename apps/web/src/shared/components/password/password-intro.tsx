import { Lightbulb } from "lucide-react";
import { Icon } from "@/shared/components/ds";

/** Título grande e o texto de apoio das telas de senha. */
export function PasswordIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex animate-guf-rise flex-col gap-2 [animation-delay:60ms]">
      <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-pretty">{title}</h1>
      <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">{subtitle}</p>
    </div>
  );
}

/** Dica no fim do formulário (como criar uma senha fácil de lembrar). */
export function PasswordTip({ children }: { children: string }) {
  return (
    <p className="m-0 flex animate-guf-rise items-start gap-2.5 px-0.5 text-fg-muted [animation-delay:260ms]">
      <Icon icon={Lightbulb} size={16} className="mt-px flex-none" />
      <span className="text-[13px] leading-[18px] text-pretty">{children}</span>
    </p>
  );
}
