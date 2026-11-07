import type { LucideIcon } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Metade do caminho: daqui o anel e o número ficam na cor do texto (antes, mais apagados). */
const HALFWAY = 50;
const COMPLETE = 100;

function ringTone(progress: number): { stroke: string; text: string } {
  if (progress >= COMPLETE) return { stroke: "stroke-accent-text", text: "text-accent-text" };
  if (progress >= HALFWAY) return { stroke: "stroke-fg", text: "text-fg" };
  return { stroke: "stroke-fg-secondary", text: "text-fg-secondary" };
}

export interface PasswordProgressRingProps {
  /** 0–100. */
  progress: number;
  icon: LucideIcon;
  overline: string;
  caption: string;
}

/** Anel do topo: fecha conforme os requisitos são cumpridos, com a % ao lado. */
export function PasswordProgressRing({ progress, icon, overline, caption }: PasswordProgressRingProps) {
  const tone = ringTone(progress);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label={`${overline}: ${progress}% dos requisitos cumpridos`}
      className="flex animate-guf-rise items-center gap-4"
    >
      <div className="relative size-[76px] flex-none">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="block size-full -rotate-90">
          <circle cx="24" cy="24" r="19" fill="none" strokeWidth="4" className="stroke-surface-3" />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - progress}
            className={cn("transition-[stroke-dashoffset,stroke] duration-500 ease-standard", tone.stroke)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-fg">
          <Icon icon={icon} size={26} />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{overline}</span>
        <span className={cn("font-display text-[40px] leading-10 font-bold tabular-nums transition-colors duration-300", tone.text)}>{progress}%</span>
        <span className="text-[13px] leading-[18px] text-fg-secondary">{caption}</span>
      </div>
    </div>
  );
}
