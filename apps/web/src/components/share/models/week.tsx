// Stories · Semana (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { TrendingDown, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ds";
import { cn } from "@/lib/utils";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

/** Circunferência do anel da meta (r = 300). */
const RING = 1885;

const remaining = (d: StoryModelProps["d"]) => Math.max(0, (d.week.goal ?? 0) - d.week.count);
function remainingTitle(d: StoryModelProps["d"]): string {
  const left = remaining(d);
  if (left === 0) return "Meta batida";
  return left === 1 ? "Falta 1 treino" : `Faltam ${left} treinos`;
}

export function Story23({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <Logo className="h-[40px]" />
        <span className="mt-[120px] text-[26px] font-semibold tracking-[.08em] text-fg-muted">VOLUME SEMANAL</span>
        <div className="mt-[8px] flex items-baseline gap-[12px]">
          <span className="font-display font-bold text-[200px] leading-[180px] text-accent-text">{d.week.volume}</span>
          <span className="font-display font-semibold text-[64px] text-fg-secondary">{d.unit}</span>
        </div>
        {d.week.changePct && (
          <div
            className={cn(
              "mt-[16px] flex items-center gap-[10px] text-[32px] font-semibold",
              d.week.changeUp ? "text-success" : "text-fg-secondary",
            )}
          >
            {d.week.changeUp ? <TrendingUp size={36} aria-hidden="true" /> : <TrendingDown size={36} aria-hidden="true" />}
            <span>{d.week.changePct} vs. semana passada</span>
          </div>
        )}
        <div className="mt-[96px] h-[520px] grid grid-cols-8 gap-[20px] items-end">
          {d.week.bars.map((w, i, list) => (
            <div key={w.label} className="flex flex-col items-center gap-[12px] h-full justify-end">
              {/* Altura proporcional ao volume da semana (valor dinâmico). */}
              <div
                className={cn(
                  "w-full rounded-tl-[16px] rounded-tr-[16px] rounded-br-[6px] rounded-bl-[6px]",
                  w.current ? "bg-accent" : "bg-data",
                  !w.current && i < list.length - 2 && "opacity-55",
                )}
                style={{ height: `${Math.max(w.pct, 2)}%` }}
              ></div>
              <span className={cn("text-[22px]", w.current ? "font-semibold text-fg" : "text-fg-muted")}>{w.label}</span>
            </div>
          ))}
        </div>
        <span className="mt-auto text-[24px] text-fg-muted">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story24({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col items-center">
        <Logo className="h-[40px]" />
        <span className="mt-[96px] text-[26px] font-semibold tracking-[.08em] text-fg-muted">META DA SEMANA</span>
        <div className="mt-[48px] relative w-[720px] h-[720px]">
          <svg width="720" height="720" viewBox="0 0 720 720" className="block">
            <circle cx="360" cy="360" r="300" fill="none" className="stroke-surface-3" strokeWidth="56" />
            <circle
              cx="360"
              cy="360"
              r="300"
              fill="none"
              className="stroke-accent"
              strokeWidth="56"
              strokeLinecap="round"
              strokeDasharray={`${Math.round(RING * d.week.goalProgress)} ${RING}`}
              transform="rotate(-90 360 360)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-baseline">
              <span className="font-display font-bold text-[240px] leading-[210px]">{d.week.count}</span>
              <span className="font-display font-semibold text-[120px] text-fg-muted">/{d.week.goal ?? d.week.count}</span>
            </div>
            <span className="text-[28px] font-semibold tracking-[.08em] text-fg-secondary">
              {d.week.count === 1 ? "TREINO" : "TREINOS"}
            </span>
          </div>
        </div>
        <span className="mt-[72px] text-[56px] leading-[64px] font-bold tracking-[-.02em] text-center">{remainingTitle(d)}</span>
        <span className="mt-[16px] text-[32px] text-fg-secondary text-center">
          {remaining(d) > 0 ? "para fechar a meta desta semana" : "meta da semana cumprida"}
        </span>
        <div className="mt-auto flex items-center gap-[16px]">
          <Logo className="h-[28px]" />
          <span className="text-[24px] text-fg-muted">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}
