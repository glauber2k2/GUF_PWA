// Stories · Moldura (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { plural } from "@guf/core";
import { GufRat, Logo, StreakFlame } from "@/shared/components/ds";
import { STORY_SIGNATURE, type StoryModelProps } from "@/features/share/type";

export function Story28({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[64px] right-[64px] top-[220px] bottom-[260px] border-[6px] border-accent rounded-[56px]"></div>
      <div className="absolute left-[120px] top-[164px] py-[12px] px-[28px] rounded-full bg-surface border border-border flex items-center gap-[12px]">
        <Logo className="h-[88px]" />
      </div>
      <div className="absolute right-[120px] top-[198px] py-[12px] px-[28px] rounded-full bg-accent text-accent-foreground text-[26px] font-bold">
        Treino concluído
      </div>
      <div className="absolute left-[120px] right-[120px] bottom-[316px] py-[32px] px-[40px] rounded-[32px] bg-surface border border-border grid grid-cols-3 gap-[16px]">
        <div className="flex flex-col gap-[4px]">
          <span className="font-display font-semibold text-[60px] leading-[60px]">{d.duration}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
        </div>
        <div className="flex flex-col gap-[4px]">
          <span className="font-display font-semibold text-[60px] leading-[60px] text-accent-text">{d.volume}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
        </div>
        <div className="flex flex-col gap-[4px]">
          <span className="font-display font-semibold text-[60px] leading-[60px]">{d.sets}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
        </div>
        <span className="col-span-3 mt-[8px] text-center text-[22px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story29({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[120px] right-[120px] bottom-[340px] -rotate-4 origin-[50%_100%]">
        <div className="absolute right-[24px] top-[-230px]">
          <GufRat occasion="saved" size={260} animated={false} label={null} />
        </div>
        <div className="relative rounded-[40px] bg-surface border border-border-strong shadow-e3 flex flex-col">
          <div className="pt-[44px] pr-[48px] pb-[36px] pl-[48px] flex flex-col gap-[12px]">
            <span className="text-[22px] font-semibold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO · {d.date.toUpperCase()}</span>
            <span className="text-[48px] leading-[56px] font-bold tracking-[-.02em]">{d.title}</span>
            <span className="text-[20px] text-fg">{STORY_SIGNATURE}</span>
          </div>
          <div className="border-t-[3px] border-dashed border-border-strong my-0 mx-[32px]"></div>
          <div className="py-[36px] px-[48px] grid grid-cols-3 gap-[16px]">
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[64px] leading-[64px]">{d.duration}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[64px] leading-[64px] text-accent-text">{d.volume}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[64px] leading-[64px]">{d.sets}</span>
              <span className="text-[20px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
            </div>
          </div>
          <div className="py-[24px] px-[48px] border-t border-border flex justify-between items-center">
            <div className="flex items-center gap-[12px]">
              <StreakFlame size={40} className="text-accent-text" />
              <span className="text-[26px] font-semibold">{plural(d.streak.current, "semana", "semanas")}</span>
            </div>
            <Logo className="h-[88px]" />
          </div>
        </div>
      </div>
    </>
  );
}

export function Story30({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] bottom-[300px] flex flex-col gap-[24px]">
        <span className="text-[176px] leading-[168px] font-bold tracking-[-.04em]">Treino pago.</span>
        <div className="flex items-center gap-[20px] font-display font-semibold text-[56px]">
          <span className="text-accent-text">
            {d.volume} {d.unit}
          </span>
          <span className="text-fg">·</span>
          <span>{d.duration}</span>
          <span className="text-fg">·</span>
          <span>{plural(d.sets, "série", "séries")}</span>
        </div>
        <div className="mt-[8px] flex items-center gap-[16px]">
          <Logo className="h-[88px]" />
          <span className="text-[24px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story31({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[64px] top-[220px] w-[140px] h-[140px] border-t-[8px] border-accent border-l-[8px] border-accent rounded-tl-[40px] rotate-0"></div>
      <div className="absolute right-[64px] top-[220px] w-[140px] h-[140px] border-t-[8px] border-accent border-l-[8px] border-accent rounded-tl-[40px] rotate-90"></div>
      <div className="absolute right-[64px] bottom-[260px] w-[140px] h-[140px] border-t-[8px] border-accent border-l-[8px] border-accent rounded-tl-[40px] rotate-180"></div>
      <div className="absolute left-[64px] bottom-[260px] w-[140px] h-[140px] border-t-[8px] border-accent border-l-[8px] border-accent rounded-tl-[40px] rotate-270"></div>
      <div className="absolute left-[120px] top-[276px]">
        <Logo className="h-[88px]" />
      </div>
      <div className="absolute left-[120px] right-[120px] bottom-[316px] flex flex-col gap-[16px]">
        <span className="text-[24px] font-semibold tracking-[.08em] text-accent-text">{d.title.toUpperCase()}</span>
        <div className="flex items-center gap-[20px] font-display font-semibold text-[60px]">
          <span>{d.duration}</span>
          <span className="text-fg">·</span>
          <span className="text-accent-text">
            {d.volume} {d.unit}
          </span>
          <span className="text-fg">·</span>
          <span>{plural(d.sets, "série", "séries")}</span>
        </div>
        <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story32({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[64px] right-[64px] top-[220px] bottom-[260px] border-solid border-surface border-t-[40px] border-x-[40px] border-b-[340px] rounded-[24px] shadow-e3"></div>
      <div className="absolute left-[104px] right-[104px] top-[1392px] bottom-[300px] flex flex-col justify-center gap-[16px]">
        <div className="flex justify-between items-center">
          <span className="text-[52px] font-bold tracking-[-.02em]">Treino pago.</span>
          <Logo className="h-[88px]" />
        </div>
        <div className="flex items-center gap-[16px] font-display font-semibold text-[44px]">
          <span>{d.duration}</span>
          <span className="text-fg">·</span>
          <span className="text-accent-text">
            {d.volume} {d.unit}
          </span>
          <span className="text-fg">·</span>
          <span>{plural(d.sets, "série", "séries")}</span>
          <span className="text-fg">·</span>
          <span className="font-sans font-normal text-[28px] text-fg">{d.date}</span>
        </div>
        <span className="text-[22px] text-fg text-[20px]">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story33({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] top-[1660px] -rotate-90 origin-top-left flex items-baseline gap-[32px] whitespace-nowrap">
        <span className="text-[200px] leading-[180px] font-bold tracking-[-.04em]">Treino pago.</span>
      </div>
      <div className="absolute right-[96px] top-[220px]">
        <Logo className="h-[88px]" />
      </div>
      <div className="absolute right-[96px] bottom-[260px] flex flex-col items-end gap-[28px] text-right">
        <div className="flex flex-col items-end gap-[4px]">
          <span className="font-display font-semibold text-[96px] leading-[88px] text-accent-text">
            {d.volume} {d.unit}
          </span>
          <span className="text-[22px] font-semibold tracking-[.08em] text-fg">VOLUME</span>
        </div>
        <div className="flex flex-col items-end gap-[4px]">
          <span className="font-display font-semibold text-[96px] leading-[88px]">{d.duration}</span>
          <span className="text-[22px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
        </div>
        <div className="flex flex-col items-end gap-[4px]">
          <span className="font-display font-semibold text-[96px] leading-[88px]">{d.sets}</span>
          <span className="text-[22px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
        </div>
        <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story35({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[90px] top-[300px] w-[900px] h-[900px]">
        <svg width="900" height="900" viewBox="0 0 900 900" className="block">
          <circle
            cx="450"
            cy="450"
            r="420"
            fill="none"
            className="stroke-accent"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="2380 2639"
            transform="rotate(-90 450 450)"
          />
          <circle cx="314" cy="53" r="22" className="fill-accent" />
        </svg>
      </div>
      <div className="absolute left-[96px] right-[96px] top-[220px] flex justify-center">
        <Logo className="h-[88px]" />
      </div>
      <div className="absolute left-[96px] right-[96px] bottom-[260px] flex flex-col items-center gap-[24px]">
        <span className="text-[80px] leading-[88px] font-bold tracking-[-.03em]">Treino pago.</span>
        <div className="self-stretch py-[32px] px-[40px] rounded-[40px] bg-surface border border-border">
          <div className="grid grid-cols-3 gap-[16px]">
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[60px] leading-[60px]">{d.duration}</span>
              <span className="text-[22px] font-semibold tracking-[.08em] text-fg text-[20px]">TEMPO</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[60px] leading-[60px] text-accent-text">{d.volume}</span>
              <span className="text-[22px] font-semibold tracking-[.08em] text-fg text-[20px]">{d.unit.toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="font-display font-semibold text-[60px] leading-[60px]">{d.sets}</span>
              <span className="text-[22px] font-semibold tracking-[.08em] text-fg text-[20px]">SÉRIES</span>
            </div>
          </div>
        </div>
        <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}
