import { Check, Clock } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { SetupPortrait } from "./setup-portrait";

export interface SetupSummaryItem {
  key: string;
  label: string;
  isDone: boolean;
}

/** Resumo "Tudo pronto" (protótipo 1e): o anel do Guf fecha e mostra o que ficou para depois. */
export function SetupDoneStep({ firstName, handle, photoUrl, initial, items }: { firstName: string; handle: string; photoUrl: string | null; initial: string; items: SetupSummaryItem[] }) {
  const hasPending = items.some((item) => !item.isDone);
  return (
    <div className="flex flex-col items-center gap-7 pt-12">
      <div className="relative size-[148px]">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute -inset-3.5 size-[calc(100%+28px)] overflow-visible">
          <circle cx="24" cy="24" r="22.5" fill="none" className="animate-guf-profile-draw stroke-accent" strokeWidth="1.6" strokeLinecap="round" pathLength="100" strokeDasharray="88 100" transform="rotate(-70 24 24)" />
          <circle cx="24" cy="1.5" r="1.4" className="fill-accent" transform="rotate(-25 24 24)" />
        </svg>
        <SetupPortrait photoUrl={photoUrl} initial={initial} size="md" />
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{firstName ? `Tudo pronto, ${firstName}` : "Tudo pronto"}</h1>
        <span className="text-[15px] leading-[22px] text-fg-secondary">@{handle}</span>
      </div>
      <ul className="m-0 flex list-none flex-col self-stretch rounded-lg border border-border bg-surface p-0">
        {items.map((item, i) => (
          <li
            key={item.key}
            className={cn("flex min-h-14 animate-guf-rise-fast items-center gap-3 px-3.5", i > 0 && "border-t border-border")}
            // Entrada escalonada (valor dinâmico).
            style={{ animationDelay: `${300 + i * 90}ms` }}
          >
            <span
              className={cn(
                "grid size-7 flex-none place-items-center rounded-pill",
                item.isDone ? "bg-accent text-accent-foreground" : "border-[1.5px] border-dashed border-border-strong text-fg-muted",
              )}
            >
              <Icon icon={item.isDone ? Check : Clock} size={14} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] leading-5 font-medium">{item.label}</span>
            <span className={cn("flex-none text-[13px]", item.isDone ? "text-accent-text" : "text-fg-muted")}>{item.isDone ? "Feito" : "Depois"}</span>
          </li>
        ))}
      </ul>
      {hasPending && (
        <span className="text-center text-[13px] leading-[18px] text-pretty text-fg-muted">O que ficou para depois você completa em Perfil › Editar perfil.</span>
      )}
    </div>
  );
}
