// Stories · Ficha (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { GufRat, Logo } from "@/shared/components/ds";
import { MuscleFigure } from "@/shared/components/ds";
import { StoryCenterCard, StoryExerciseRows } from "./center-card";
import { plural } from "@guf/core";
import { cn } from "@/shared/helpers/class-names";
import { STORY_SIGNATURE, type StoryModelProps } from "@/features/share/type";

/** Linhas de exercício que cabem na arte (o resto fica de fora). */
const MAX_ROWS = 6;

export function Story20B({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[88px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <div className="mt-[40px] flex justify-center gap-[56px]">
          <MuscleFigure view="front" height={420} levels={d.muscles} />
          <MuscleFigure view="back" height={420} levels={d.muscles} />
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

export function Story21({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <Logo className="h-[88px]" />
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

/** Linhas do "Treino de hoje" (modelos 37 e 38). */
const TODAY_ROWS = 6;
const todayMeta = (d: StoryModelProps["d"]) =>
  `${plural(d.exerciseCount, "exercício", "exercícios")} · ${plural(d.sets, "série", "séries")} · ${d.duration}`;

export function Story37({ d }: StoryModelProps) {
  return (
    <StoryCenterCard label={d.date}>
      <div className="flex items-center gap-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <span className="text-[30px] font-bold tracking-[.08em] text-accent-text">TREINO DE HOJE</span>
          <span className="text-[52px] leading-[58px] font-bold tracking-[-.02em]">{d.title}</span>
          <span className="text-[32px] text-fg">{todayMeta(d)}</span>
        </div>
        <div className="flex flex-none gap-[8px]">
          <MuscleFigure view="front" height={220} levels={d.muscles} />
          <MuscleFigure view="back" height={220} levels={d.muscles} />
        </div>
      </div>
      <StoryExerciseRows rows={d.exercises.slice(0, TODAY_ROWS)} />
    </StoryCenterCard>
  );
}

export function Story38({ d }: StoryModelProps) {
  return (
    <StoryCenterCard label={d.date}>
      <div className="flex items-center gap-[20px]">
        <div className="flex-none">
          <GufRat occasion="loadUp" size={230} animated={false} label={null} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <span className="text-[30px] font-bold tracking-[.08em] text-accent-text">TREINO DE HOJE</span>
          <span className="text-[48px] leading-[54px] font-bold tracking-[-.02em]">{d.title}</span>
          <span className="text-[32px] text-fg">{todayMeta(d)}</span>
        </div>
      </div>
      <StoryExerciseRows rows={d.exercises.slice(0, TODAY_ROWS)} />
    </StoryCenterCard>
  );
}
