// Stories · Recorde (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { Trophy } from "lucide-react";
import { GufRat, Logo } from "@/components/ds";
import { STORY_SIGNATURE, type StoryModelProps } from "../story-types";

export function Story10({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[88px]" />
          <span className="text-[28px] text-fg">{d.date}</span>
        </div>
        <div className="relative mt-[24px] h-[420px] flex justify-center items-center">
          <div className="absolute left-1/2 top-1/2 w-[680px] h-[680px] mt-[-340px] mr-0 mb-0 ml-[-340px] rounded-full bg-radial from-pr/26 to-transparent to-62%"></div>
          <div className="relative">
            <GufRat occasion="personalRecord" size={380} animated={false} label={null} />
          </div>
        </div>
        <div className="mt-[24px] flex justify-center items-center gap-[12px] text-pr-text text-[28px] font-semibold tracking-[.08em]">
          <Trophy size={32} aria-hidden="true" />
          <span>RECORDES PESSOAIS</span>
        </div>
        <div className="mt-[16px] text-center text-[68px] leading-[76px] font-bold tracking-[-.02em]">
          {d.records.length === 1 ? "1 recorde quebrado" : `${d.records.length} recordes quebrados`}
        </div>
        <div className="mt-[48px] flex flex-col gap-[24px]">
          {/* Até 3 recordes cabem na arte. */}
          {d.records.slice(0, 3).map((r) => (
            <div
              key={r.exerciseName}
              className="py-[32px] px-[40px] rounded-[32px] bg-surface border-[2px] border-pr-text/36 flex items-center justify-between gap-[24px]"
            >
              <div className="flex min-w-0 flex-col gap-[4px]">
                <span className="truncate text-[28px] font-semibold text-fg">{r.exerciseName}</span>
                <div className="flex items-baseline gap-[8px] text-pr-text">
                  <span className="font-display font-bold text-[104px] leading-[92px]">{r.load}</span>
                  <span className="font-display font-semibold text-[40px]">{d.unit}</span>
                </div>
              </div>
              <span className="h-[56px] flex-none py-0 px-[20px] rounded-full bg-pr text-pr-foreground flex items-center font-display font-bold text-[40px]">
                {r.delta}
              </span>
            </div>
          ))}
        </div>
        <span className="mt-[32px] text-center text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story11({ d }: StoryModelProps) {
  const r = d.records[0];
  if (!r) return null;
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <Logo className="h-[88px]" />
        <div className="mt-[160px] flex items-center gap-[12px] text-pr-text text-[28px] font-semibold tracking-[.08em]">
          <Trophy size={32} aria-hidden="true" />
          <span>RECORDE PESSOAL</span>
        </div>
        <div className="mt-[16px] text-[72px] leading-[80px] font-bold tracking-[-.02em]">{r.exerciseName}</div>
        <div className="mt-[96px] flex flex-col gap-[48px]">
          {r.previousLoad && (
            <div className="flex flex-col gap-[16px]">
              <div className="flex justify-between items-baseline">
                <span className="text-[26px] font-semibold tracking-[.08em] text-fg">{r.previousLabel}</span>
                <div className="flex items-baseline gap-[8px] text-fg">
                  <span className="font-display font-semibold text-[120px] leading-[104px]">{r.previousLoad}</span>
                  <span className="font-display font-semibold text-[44px]">{d.unit}</span>
                </div>
              </div>
              <div className="h-[32px] rounded-full bg-surface-3">
                {/* Largura proporcional à marca anterior (valor dinâmico). */}
                <div className="h-full rounded-full bg-fg-muted" style={{ width: `${r.previousPct}%` }}></div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-[16px]">
            <div className="flex justify-between items-baseline">
              <span className="text-[26px] font-semibold tracking-[.08em] text-pr-text">HOJE</span>
              <div className="flex items-baseline gap-[8px] text-pr-text">
                <span className="font-display font-bold text-[200px] leading-[170px]">{r.load}</span>
                <span className="font-display font-semibold text-[64px]">{d.unit}</span>
              </div>
            </div>
            <div className="h-[32px] rounded-full bg-surface-3">
              <div className="w-full h-full rounded-full bg-pr"></div>
            </div>
          </div>
        </div>
        <span className="mt-[56px] self-start h-[72px] py-0 px-[32px] rounded-full bg-pr text-pr-foreground flex items-center font-display font-bold text-[48px]">
          {[r.delta, r.deltaPct].filter(Boolean).join(" · ")}
        </span>
        <div className="mt-[32px] flex justify-between">
          <span className="text-[28px] text-fg">{[r.scheme, d.date].filter(Boolean).join(" · ")}</span>
          <span className="text-[24px] text-fg">{STORY_SIGNATURE}</span>
        </div>
      </div>
    </>
  );
}

export function Story12({ d }: StoryModelProps) {
  const r = d.records[0];
  if (!r) return null;
  return (
    <>
      <div className="absolute right-[96px] top-[220px]">
        <Logo className="h-[88px]" />
      </div>
      <div className="absolute left-[64px] right-[64px] bottom-[260px] p-[40px] rounded-[48px] bg-surface border-[2px] border-pr-text/40 shadow-story-pr flex items-center gap-[36px]">
        <div className="flex-none w-[160px] h-[160px] rounded-full bg-pr/18 text-pr-text flex items-center justify-center">
          <Trophy size={80} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
          <span className="text-[24px] font-semibold tracking-[.08em] text-pr-text">RECORDE PESSOAL</span>
          <span className="truncate text-[40px] font-bold tracking-[-.01em]">{r.exerciseName}</span>
          <div className="flex items-center gap-[20px]">
            <div className="flex items-baseline gap-[6px] text-pr-text">
              <span className="font-display font-bold text-[88px] leading-[80px]">{r.load}</span>
              <span className="font-display font-semibold text-[36px]">{d.unit}</span>
            </div>
            <span className="h-[52px] py-0 px-[18px] rounded-full bg-pr text-pr-foreground flex items-center font-display font-bold text-[34px]">
              {r.delta}
            </span>
          </div>
        </div>
      </div>
      <span className="absolute left-0 right-0 bottom-[204px] text-center text-[22px] text-fg">{STORY_SIGNATURE}</span>
    </>
  );
}
