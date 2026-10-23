// Stories · Mapa muscular (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { Logo } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { MuscleFigure } from "@/shared/components/ds";
import { STORY_SIGNATURE, type StoryModelProps } from "@/features/share/type";

/** Legenda: mesma intensidade das regiões do boneco (níveis 1–3). */
const LEVEL_OPACITY = { 1: "opacity-36", 2: "opacity-64", 3: "" } as const;

export function Story01({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col items-center">
        <div className="self-stretch flex justify-between items-center h-[48px]">
          <span className="text-[26px] font-semibold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO</span>
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <div className="mt-[24px] self-stretch text-[64px] leading-[72px] font-bold tracking-[-.02em]">{d.title}</div>
        <div className="mt-[56px] flex gap-[72px] items-end">
          <MuscleFigure view="front" height={560} levels={d.muscles} />
          <MuscleFigure view="back" height={560} levels={d.muscles} />
        </div>
        <div className="mt-[40px] flex gap-[40px]">
          {d.muscleLegend.map((m) => (
            <div key={m.label} className="flex items-center gap-[12px]">
              <span className={cn("w-[24px] h-[24px] rounded-[8px] bg-accent-text", LEVEL_OPACITY[m.level])}></span>
              <span className="text-[28px] text-fg">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-[56px] self-stretch py-[40px] px-[48px] rounded-[40px] bg-surface border border-border grid grid-cols-4 gap-[16px]">
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[56px] leading-[56px]">{d.duration}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-baseline gap-[6px]">
              <span className="font-display font-semibold text-[56px] leading-[56px] text-accent-text">{d.volume}</span>
              <span className="text-[24px] text-fg">{d.unit}</span>
            </div>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">VOLUME</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[56px] leading-[56px]">{d.sets}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[56px] leading-[56px]">{d.reps}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">REPS</span>
          </div>
        </div>
        <div className="mt-[32px] flex items-center gap-[16px]">
          <Logo className="h-[88px]" />
          <span className="text-[24px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story02({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute right-[8px] top-[420px]">
        <MuscleFigure view="front" height={1000} levels={d.muscles} />
      </div>
      <div className="absolute left-[96px] top-[220px] bottom-[260px] w-[460px] flex flex-col">
        <Logo className="h-[88px]" />
        <div className="mt-[72px] text-[60px] leading-[68px] font-bold tracking-[-.02em]">{d.focus}</div>
        <span className="mt-[12px] text-[28px] text-fg">{[d.routine, d.date].filter(Boolean).join(" · ")}</span>
        <div className="mt-[88px] flex flex-col gap-[56px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-[24px] font-semibold tracking-[.08em] text-fg">VOLUME</span>
            <div className="flex items-baseline gap-[8px]">
              <span className="font-display font-bold text-[136px] leading-[120px] text-accent-text">{d.volume}</span>
              <span className="text-[36px] text-fg">{d.unit}</span>
            </div>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[24px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
            <span className="font-display font-bold text-[136px] leading-[120px]">{d.duration}</span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[24px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
            <span className="font-display font-bold text-[136px] leading-[120px]">{d.sets}</span>
          </div>
        </div>
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story03({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[64px] right-[64px] bottom-[260px] flex flex-col gap-[24px]">
        <div className="p-[48px] rounded-[48px] bg-surface border border-border flex gap-[40px] items-center">
          <div className="flex gap-[16px] flex-none">
            <MuscleFigure view="front" height={300} levels={d.muscles} />
            <MuscleFigure view="back" height={300} levels={d.muscles} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-[12px]">
            <span className="text-[22px] font-semibold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO</span>
            <span className="text-[40px] leading-[48px] font-bold tracking-[-.02em]">{d.title}</span>
            <div className="mt-[20px] grid grid-cols-2 gap-y-[24px] gap-x-[16px]">
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[52px] leading-[52px]">{d.duration}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[52px] leading-[52px] text-accent-text">{d.volume}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[52px] leading-[52px]">{d.sets}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="font-display font-semibold text-[52px] leading-[52px]">{d.exerciseCount}</span>
                <span className="text-[20px] font-semibold tracking-[.08em] text-fg">EXERCÍCIOS</span>
              </div>
            </div>
          </div>
        </div>
        <div className="self-center flex items-center gap-[16px] py-[16px] px-[28px] rounded-full bg-surface border border-border">
          <Logo className="h-[88px]" />
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}
