// Stories · Ficha (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { Trophy } from "lucide-react";
import { Logo } from "@/components/ds";
import { StoryFigure } from "../story-figure";
import { plural } from "@guf/core";
import { cn } from "@/lib/utils";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

/** Linhas de exercício que cabem na arte (o resto fica de fora). */
const MAX_ROWS = 6;

export function Story19({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] p-[56px] rounded-[32px] bg-surface border border-border flex flex-col">
        <div className="flex flex-col items-center gap-[12px]">
          <Logo className="h-[44px]" />
          <span className="text-[24px] text-fg">Evolução Fitness</span>
          <span className="text-[26px] text-fg">{d.dateTime}</span>
        </div>
        <div className="mt-[40px] border-t-[3px] border-dashed border-border-strong"></div>
        <span className="mt-[32px] text-[40px] font-bold tracking-[-.01em]">{d.title}</span>
        <div className="mt-[24px] flex flex-col gap-[20px] text-[28px]">
          {d.exercises.slice(0, MAX_ROWS).map((e) => (
            <div key={e.name} className="flex gap-[16px]">
              <span className="flex-1 min-w-0 truncate">{e.name}</span>
              <span className="w-[110px] text-right font-display font-semibold text-[32px] text-fg">{e.scheme}</span>
              {e.loadShort === "corporal" ? (
                <span className="w-[130px] text-right text-[22px] text-fg">corporal</span>
              ) : (
                <span className="w-[130px] text-right font-display font-semibold text-[32px]">{e.loadShort}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-[40px] border-t-[3px] border-dashed border-border-strong"></div>
        <div className="mt-[32px] flex flex-col gap-[16px] text-[28px] text-fg">
          <div className="flex justify-between">
            <span>Tempo</span>
            <span className="font-display font-semibold text-[34px] text-fg">{d.duration}</span>
          </div>
          <div className="flex justify-between">
            <span>Séries</span>
            <span className="font-display font-semibold text-[34px] text-fg">{d.sets}</span>
          </div>
          <div className="flex justify-between">
            <span>Repetições</span>
            <span className="font-display font-semibold text-[34px] text-fg">{d.reps}</span>
          </div>
        </div>
        <div className="mt-[24px] flex justify-between items-baseline">
          <span className="text-[32px] font-bold">VOLUME TOTAL</span>
          <span className="font-display font-bold text-[80px] leading-[80px] text-accent-text">
            {d.volume} {d.unit}
          </span>
        </div>
        <div className="mt-[32px] border-t-[3px] border-dashed border-border-strong pt-[28px] text-center text-[22px] text-fg">
          {STORY_SIGNATURE}
        </div>
      </div>
    </>
  );
}

export function Story20({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[40px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <div className="mt-[56px] flex items-center gap-[40px]">
          <div className="flex gap-[12px] flex-none">
            <StoryFigure view="front" height={300} levels={d.muscles} />
            <StoryFigure view="back" height={300} levels={d.muscles} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-[24px]">
            <span className="text-[52px] leading-[60px] font-bold tracking-[-.02em]">{d.title}</span>
            <div className="grid grid-cols-2 gap-[20px]">
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[56px] leading-[56px]">{d.duration}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[56px] leading-[56px] text-accent-text">{d.volume}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[64px] flex items-center gap-[24px] h-[48px] border-b-[2px] border-border-strong text-[22px] font-semibold tracking-[.08em] text-fg">
          <span className="flex-1">EXERCÍCIO</span>
          <span className="w-[96px] text-right">SÉRIES</span>
          <span className="w-[96px] text-right">REPS</span>
          <span className="w-[150px] text-right">CARGA</span>
        </div>
        {d.exercises.slice(0, MAX_ROWS).map((e) => (
          <div key={e.name} className="flex items-center gap-[24px] h-[72px] border-b border-border text-[30px]">
            <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{e.name}</span>
            <span className="w-[96px] text-right font-display font-semibold text-[36px] text-fg">{e.setCount}</span>
            <span className="w-[96px] text-right font-display font-semibold text-[36px] text-fg">{e.reps ?? "—"}</span>
            {e.loadShort === "corporal" ? (
              <span className="w-[150px] text-right text-[22px] text-fg">corporal</span>
            ) : (
              <span className="w-[150px] text-right font-display font-semibold text-[36px]">{e.loadShort}</span>
            )}
          </div>
        ))}
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story20B({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[40px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <div className="mt-[40px] flex justify-center gap-[56px]">
          <StoryFigure view="front" height={420} levels={d.muscles} />
          <StoryFigure view="back" height={420} levels={d.muscles} />
        </div>
        <span className="mt-[40px] text-[56px] leading-[64px] font-bold tracking-[-.02em] text-center">{d.title}</span>
        <div className="mt-[40px] py-[16px] px-[40px] rounded-[32px] bg-surface border border-border flex flex-col">
          {d.exercises.slice(0, MAX_ROWS).map((e, i, list) => (
            <div
              key={e.name}
              className={cn("flex items-center gap-[24px] h-[76px] text-[30px]", i < list.length - 1 && "border-b border-border")}
            >
              <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{e.name}</span>
              <span className="w-[120px] text-right font-display font-semibold text-[34px] text-fg">{e.scheme}</span>
              <span className="w-[170px] text-right">
                {e.loadShort === "corporal" ? (
                  <span className="text-[22px] text-fg">{e.load}</span>
                ) : (
                  <span className="font-display font-semibold text-[36px]">{e.load}</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-[32px] flex justify-between items-center">
          <span className="text-[28px] text-fg">
            {d.duration} ·{" "}
            <span className="text-accent-text">
              {d.volume} {d.unit}
            </span>{" "}
            · {plural(d.sets, "série", "séries")}
          </span>
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story20C({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-start gap-[24px]">
          <div className="flex flex-col gap-[16px]">
            <Logo className="h-[40px]" />
            <span className="mt-[40px] text-[24px] font-semibold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO</span>
            <span className="text-[60px] leading-[68px] font-bold tracking-[-.02em]">{d.focus}</span>
            <span className="text-[28px] text-fg">{[d.routine, d.date].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="flex gap-[8px]">
            <StoryFigure view="front" height={360} levels={d.muscles} />
            <StoryFigure view="back" height={360} levels={d.muscles} />
          </div>
        </div>
        <div className="mt-[48px] grid grid-cols-2 gap-[20px]">
          {d.exercises.slice(0, MAX_ROWS).map((e) => (
            <div
              key={e.name}
              className={cn(
                "py-[28px] px-[32px] rounded-[28px] bg-surface flex flex-col gap-[12px]",
                e.isRecord ? "border-[2px] border-pr-text/40" : "border border-border",
              )}
            >
              <div className="flex justify-between gap-[8px]">
                <span className="text-[26px] font-semibold text-fg whitespace-nowrap overflow-hidden text-ellipsis">
                  {e.name}
                </span>
                {e.isRecord && <Trophy size={28} aria-hidden="true" className="flex-none text-pr-text" />}
              </div>
              <div className="flex items-baseline justify-between gap-[8px]">
                {e.loadShort === "corporal" ? (
                  <span className="text-[30px] font-semibold">{e.load}</span>
                ) : (
                  <span className={cn("font-display font-bold text-[72px] leading-[64px]", e.isRecord && "text-pr-text")}>{e.load}</span>
                )}
                <span className="font-display font-semibold text-[34px] text-fg">{e.scheme}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[32px] flex justify-between items-center">
          <span className="text-[28px] text-fg">
            {d.duration} ·{" "}
            <span className="text-accent-text">
              {d.volume} {d.unit}
            </span>
          </span>
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story20D({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[40px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <span className="mt-[64px] text-[56px] leading-[64px] font-bold tracking-[-.02em]">{d.title}</span>
        <div className="mt-[40px] flex items-center gap-[24px] h-[48px] border-b-[2px] border-border-strong text-[22px] font-semibold tracking-[.08em] text-fg">
          <span className="flex-1">EXERCÍCIO</span>
          <span className="w-[120px] text-right">SÉRIES</span>
          <span className="w-[170px] text-right">VOLUME</span>
        </div>
        {d.exercises.slice(0, MAX_ROWS).map((e) => (
          <div key={e.name} className="flex items-center gap-[24px] h-[80px] border-b border-border">
            <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
              <span className="text-[30px] whitespace-nowrap overflow-hidden text-ellipsis">{e.name}</span>
              <span className={cn("text-[22px]", e.isRecord ? "text-pr-text" : "text-fg")}>
                {e.isRecord ? `Recorde · ${e.load}` : e.load}
              </span>
            </div>
            <span className="w-[120px] text-right font-display font-semibold text-[36px] text-fg">{e.scheme}</span>
            <span className="w-[170px] text-right font-display font-semibold text-[36px]">{e.volume}</span>
          </div>
        ))}
        <div className="mt-[40px] py-[32px] px-[40px] rounded-[40px] bg-surface border border-border flex items-center gap-[40px]">
          <div className="flex gap-[12px] flex-none">
            <StoryFigure view="front" height={300} levels={d.muscles} />
            <StoryFigure view="back" height={300} levels={d.muscles} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-y-[28px] gap-x-[16px]">
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[56px] leading-[56px] text-accent-text">{d.volume}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[56px] leading-[56px]">{d.duration}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[56px] leading-[56px]">{d.sets}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[56px] leading-[56px]">{d.reps}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">REPS</span>
            </div>
          </div>
        </div>
        <div className="mt-[32px] text-center">
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story21({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <Logo className="h-[40px]" />
        <span className="mt-[96px] text-[26px] font-semibold tracking-[.08em] text-fg">VOLUME POR EXERCÍCIO</span>
        <span className="mt-[12px] text-[64px] leading-[72px] font-bold tracking-[-.02em]">{d.focus}</span>
        <div className="mt-[72px] flex flex-col gap-[44px]">
          {d.volumeRanking.map((e, i) => (
            <div key={e.name} className="flex flex-col gap-[14px]">
              <div className="flex justify-between items-baseline gap-[24px]">
                <span className="truncate text-[32px]">{e.name}</span>
                <span className={cn("flex-none font-display font-semibold text-[40px]", i === 0 && "text-accent-text")}>{e.volume}</span>
              </div>
              <div className="h-[20px] rounded-full bg-surface-3">
                {/* Largura proporcional ao maior volume (valor dinâmico). */}
                <div className={cn("h-full rounded-full", i === 0 ? "bg-accent" : "bg-fg-secondary")} style={{ width: `${e.pct}%` }}></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[32px] flex justify-between items-center">
          <span className="text-[28px] text-fg">
            {d.duration} · {plural(d.sets, "série", "séries")} · {d.date}
          </span>
          <span className="text-[24px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}
