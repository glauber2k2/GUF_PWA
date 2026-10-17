// Stories · Números (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { Logo } from "@/components/ds";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

export function Story04({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[88px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <span className="mt-[240px] text-[30px] font-semibold tracking-[.08em] text-fg">VOLUME TOTAL</span>
        <span className="mt-[8px] font-display font-bold text-[300px] leading-[.9] tracking-[-.01em] text-accent-text">{d.volume}</span>
        <span className="mt-[16px] text-[40px] text-fg">{d.unit === "kg" ? "quilos" : "libras"} levantados hoje</span>
        <div className="mt-[96px] pt-[40px] border-t border-border-strong grid grid-cols-3 gap-[24px]">
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[80px] leading-[80px]">{d.duration}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[80px] leading-[80px]">{d.sets}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="font-display font-semibold text-[80px] leading-[80px]">{d.reps}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">REPS</span>
          </div>
        </div>
        <div className="mt-[32px] flex justify-between items-center gap-[24px]">
          <span className="text-[28px] text-fg">{d.title}</span>
          <span className="text-[24px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story05({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex items-center justify-between gap-[24px]">
          <span className="text-[26px] font-semibold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO</span>
          <Logo className="h-[88px]" />
        </div>
        <div className="mt-[120px] flex flex-col gap-[56px]">
          <div className="flex flex-col gap-0">
            <span className="text-[26px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
            <span className="font-display font-bold text-[220px] leading-[200px]">{d.duration}</span>
          </div>
          <div className="flex flex-col gap-0">
            <span className="text-[26px] font-semibold tracking-[.08em] text-fg">VOLUME</span>
            <div className="flex items-baseline gap-[12px]">
              <span className="font-display font-bold text-[220px] leading-[200px] text-accent-text">{d.volume}</span>
              <span className="font-display font-semibold text-[80px] text-fg">{d.unit}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0">
            <span className="text-[26px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
            <span className="font-display font-bold text-[220px] leading-[200px]">{d.sets}</span>
          </div>
        </div>
        <div className="mt-[32px] flex justify-between items-center gap-[24px]">
          <span className="text-[28px] text-fg">
            {d.focus} · {d.date}
          </span>
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story06({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col items-center">
        <span className="text-[28px] text-fg">{d.date}</span>
        <div className="mt-[96px] relative w-[760px] h-[760px]">
          <svg width="760" height="760" viewBox="0 0 760 760" className="block">
            <circle cx="380" cy="380" r="356" className="fill-surface" />
            <circle cx="380" cy="380" r="300" fill="none" className="stroke-surface-3" strokeWidth="36" />
            <circle
              cx="380"
              cy="380"
              r="300"
              fill="none"
              className="stroke-accent"
              strokeWidth="36"
              strokeLinecap="round"
              strokeDasharray="1700 1885"
              transform="rotate(-90 380 380)"
            />
            <circle cx="289" cy="94" r="22" className="fill-accent" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[8px]">
            <span className="font-display font-bold text-[170px] leading-[150px]">{d.volume}</span>
            <span className="text-[26px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()} LEVANTADOS</span>
          </div>
        </div>
        <span className="mt-[72px] text-[52px] leading-[60px] font-bold tracking-[-.02em] text-center">{d.title}</span>
        <div className="mt-[48px] flex gap-[72px]">
          <div className="flex flex-col items-center gap-[6px]">
            <span className="font-display font-semibold text-[64px] leading-[64px]">{d.duration}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
          </div>
          <div className="flex flex-col items-center gap-[6px]">
            <span className="font-display font-semibold text-[64px] leading-[64px]">{d.sets}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
          </div>
          <div className="flex flex-col items-center gap-[6px]">
            <span className="font-display font-semibold text-[64px] leading-[64px]">{d.exerciseCount}</span>
            <span className="text-[22px] font-semibold tracking-[.08em] text-fg">EXERCÍCIOS</span>
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
