// Stories · Sequência (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { plural } from "@guf/core";
import { GufRat, Logo, StreakFlame } from "@/components/ds";
import { cn } from "@/lib/utils";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

export function Story13({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col items-center">
        <Logo className="h-[40px]" />
        <StreakFlame size={420} className="mt-[96px] text-accent-text" />
        <span className="mt-[24px] font-display font-bold text-[280px] leading-[240px]">{d.streak.current}</span>
        <span className="mt-[8px] text-[34px] font-semibold tracking-[.08em] text-accent-text">
          {d.streak.current === 1 ? "SEMANA SEGUIDA" : "SEMANAS SEGUIDAS"}
        </span>
        <div className="mt-[72px] grid grid-cols-[repeat(6,96px)] gap-[16px]">
          {d.streak.last12.map((trained, i) => (
            <span key={i} className={cn("h-[96px] rounded-[20px]", trained ? "bg-accent" : "border-[3px] border-border-strong")}></span>
          ))}
        </div>
        <span className="mt-[32px] text-[28px] text-fg">Pelo menos 1 treino em cada semana</span>
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story14({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col items-center">
        <div className="self-stretch flex justify-between items-center h-[48px]">
          <Logo className="h-[40px]" />
          <span className="text-[28px] text-fg">Semana {d.streak.weekNumber}</span>
        </div>
        <div className="mt-[96px] w-[620px] h-[620px] rounded-full bg-surface border border-border flex items-center justify-center">
          <GufRat occasion="streak" size={460} animated={false} label={null} />
        </div>
        <div className="mt-[56px] flex items-center gap-[20px]">
          <StreakFlame size={88} className="text-accent-text" />
          <span className="text-[80px] leading-[88px] font-bold tracking-[-.02em]">{plural(d.streak.current, "semana", "semanas")}</span>
        </div>
        <span className="mt-[12px] text-[32px] text-fg">seguidas sem faltar</span>
        <div className="mt-[72px] self-stretch flex justify-between">
          {d.streak.last16.map((trained, i) => (
            <span
              key={i}
              className={cn(
                "w-[40px] h-[40px] rounded-full",
                trained ? "bg-accent" : "border-[3px] border-border-strong",
                i === d.streak.last16.length - 1 && "shadow-story-ring",
              )}
            ></span>
          ))}
        </div>
        <div className="mt-[16px] self-stretch flex justify-between text-[22px] text-fg">
          {d.streak.monthLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story15({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-0 right-0 bottom-[300px] flex flex-col items-center gap-[24px]">
        <div className="flex items-center gap-[24px] pt-[28px] pr-[56px] pb-[28px] pl-[36px] rounded-full bg-surface border border-border-strong">
          <StreakFlame size={120} className="text-accent-text" />
          <span className="font-display font-bold text-[150px] leading-[130px]">{d.streak.current}</span>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[34px] font-bold">{d.streak.current === 1 ? "semana" : "semanas"}</span>
            <span className="text-[34px] font-bold">{d.streak.current === 1 ? "seguida" : "seguidas"}</span>
          </div>
        </div>
        <div className="flex items-center gap-[12px] py-[12px] px-[24px] rounded-full bg-surface border border-border">
          <Logo className="h-[28px]" />
          <span className="text-[22px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}
