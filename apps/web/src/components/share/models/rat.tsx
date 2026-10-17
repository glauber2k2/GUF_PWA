// Stories · Guf Rat (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { plural } from "@guf/core";
import { GufRat, Logo } from "@/components/ds";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

export function Story08({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] top-[220px] flex items-center gap-[16px] py-[16px] px-[28px] rounded-full bg-surface border border-border">
        <Logo className="h-[32px]" />
      </div>
      <div className="absolute left-[400px] right-[96px] top-[640px] p-[48px] rounded-[48px] bg-surface border border-border flex flex-col gap-[12px]">
        <span className="text-[30px] text-fg-secondary">Hoje foram</span>
        <div className="flex items-baseline gap-[10px]">
          <span className="font-display font-bold text-[136px] leading-[120px] text-accent-text">{d.volume}</span>
          <span className="font-display font-semibold text-[52px] text-fg-secondary">{d.unit}</span>
        </div>
        <span className="text-[30px] leading-[40px] text-fg-secondary">
          {plural(d.sets, "série", "séries")} · {d.duration} · {plural(d.exerciseCount, "exercício", "exercícios")}
        </span>
        <div className="absolute left-[64px] bottom-[-24px] w-[48px] h-[48px] bg-surface border-r border-border border-b border-border rotate-45"></div>
      </div>
      <div className="absolute left-[24px] bottom-[280px]">
        <GufRat occasion="tip" size={540} animated={false} label={null} />
      </div>
      <span className="absolute right-[96px] bottom-[280px] text-[24px] text-fg-muted">{STORY_SIGNATURE}</span>
    </>
  );
}
