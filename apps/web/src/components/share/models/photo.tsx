// Stories · Sobre a foto (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { Trophy } from "lucide-react";
import { Logo, StreakFlame } from "@/components/ds";
import { STORY_SIGNATURE, STORY_SIGNATURE_LEAD, STORY_DOMAIN, type StoryModelProps } from "../story-types";

export function Story16({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-0 right-0 bottom-[260px] pt-[40px] pr-[96px] pb-[48px] pl-[96px] bg-surface border-t-[4px] border-accent flex flex-col gap-[28px]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[30px] font-semibold">{d.title}</span>
            <span className="text-[20px] text-fg-muted">{STORY_SIGNATURE}</span>
          </div>
          <Logo className="h-[32px]" />
        </div>
        <div className="grid grid-cols-4 gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <span className="font-display font-semibold text-[68px] leading-[68px]">{d.duration}</span>
            <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">TEMPO</span>
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="font-display font-semibold text-[68px] leading-[68px] text-accent-text">{d.volume}</span>
            <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">{d.unit.toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="font-display font-semibold text-[68px] leading-[68px]">{d.sets}</span>
            <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">SÉRIES</span>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-[8px] text-pr-text">
              <Trophy size={44} aria-hidden="true" />
              <span className="font-display font-semibold text-[68px] leading-[68px]">{d.records.length}</span>
            </div>
            <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">RECORDES</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function Story17({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[64px] top-[220px] w-[400px] p-[40px] rounded-[40px] bg-surface border border-border flex flex-col gap-[28px]">
        <Logo className="h-[32px]" />
        <span className="text-[28px] leading-[36px] font-semibold">{d.focus}</span>
        <div className="flex flex-col gap-[4px] pt-[24px] border-t border-border">
          <span className="font-display font-semibold text-[72px] leading-[72px] text-accent-text">{d.volume}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">{d.unit.toUpperCase()} DE VOLUME</span>
        </div>
        <div className="flex flex-col gap-[4px] pt-[24px] border-t border-border">
          <span className="font-display font-semibold text-[72px] leading-[72px]">{d.duration}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">TEMPO</span>
        </div>
        <div className="flex flex-col gap-[4px] pt-[24px] border-t border-border">
          <span className="font-display font-semibold text-[72px] leading-[72px]">{d.sets}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">SÉRIES</span>
        </div>
      </div>
      <span className="absolute right-[96px] bottom-[280px] py-[12px] px-[24px] rounded-full bg-surface border border-border text-[22px] text-fg-secondary">
        {STORY_SIGNATURE}
      </span>
    </>
  );
}

export function Story18({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute right-[64px] top-[260px] bottom-[300px] w-[240px] py-[48px] px-0 rounded-full bg-surface border border-border flex flex-col items-center justify-between">
        <Logo className="h-[32px]" />
        <div className="flex flex-col items-center gap-[4px]">
          <span className="font-display font-semibold text-[72px] leading-[72px]">{d.duration}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">TEMPO</span>
        </div>
        <div className="flex flex-col items-center gap-[4px]">
          <span className="font-display font-semibold text-[72px] leading-[72px] text-accent-text">{d.volumeCompact}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">VOLUME</span>
        </div>
        <div className="flex flex-col items-center gap-[4px]">
          <span className="font-display font-semibold text-[72px] leading-[72px]">{d.sets}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg-muted">SÉRIES</span>
        </div>
        <div className="flex flex-col items-center gap-[4px] text-pr-text">
          <Trophy size={48} aria-hidden="true" />
          <span className="font-display font-semibold text-[56px] leading-[56px]">{d.records.length} PR</span>
        </div>
        <div className="flex flex-col items-center gap-[4px]">
          <StreakFlame size={64} className="text-accent-text" />
          <span className="font-display font-semibold text-[56px] leading-[56px]">{d.streak.current} sem</span>
        </div>
        <span className="text-[18px] leading-[24px] text-center text-fg-muted">
          {STORY_SIGNATURE_LEAD}
          <br />
          {STORY_DOMAIN}
        </span>
      </div>
    </>
  );
}
