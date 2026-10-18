// Stories · Evolução (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import { GufRat, Logo } from "@/shared/components/ds";
import { StoryFigure } from "@/features/share/components/story-figure";
import { cn } from "@/shared/helpers/class-names";
import { STORY_SIGNATURE, type StoryModelProps } from "@/features/share/type";

/** Intensidade das barras pela posição (como no design: 2 cheias, 2 médias, o resto leve). */
const SHARE_OPACITY = ["", "", "opacity-64", "opacity-64", "opacity-36"] as const;

export function Story25({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] flex justify-between items-center h-[48px]">
        <Logo className="h-[88px]" />
        <span className="text-[28px] text-fg">{d.date}</span>
      </div>
      <div className="absolute left-[96px] right-[96px] top-[320px] text-[64px] leading-[72px] font-bold tracking-[-.02em]">
        {d.focus} em dia
      </div>
      <div className="absolute right-[72px] top-[480px]">
        <StoryFigure view="front" height={760} levels={d.muscles} />
      </div>
      <div className="absolute left-[40px] top-[760px]">
        <GufRat occasion="goalReached" size={500} animated={false} label={null} />
      </div>
      <div className="absolute left-[96px] right-[96px] bottom-[260px] py-[36px] px-[48px] rounded-[40px] bg-surface border border-border grid grid-cols-3 gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <span className="font-display font-semibold text-[60px] leading-[60px]">{d.duration}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="font-display font-semibold text-[60px] leading-[60px] text-accent-text">{d.volume}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">{d.unit.toUpperCase()}</span>
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="font-display font-semibold text-[60px] leading-[60px]">{d.sets}</span>
          <span className="text-[20px] font-semibold tracking-[.08em] text-fg">SÉRIES</span>
        </div>
      </div>
      <span className="absolute left-0 right-0 bottom-[204px] text-center text-[22px] text-fg">{STORY_SIGNATURE}</span>
    </>
  );
}

export function Story26({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <Logo className="h-[88px]" />
        <span className="mt-[80px] text-[26px] font-semibold tracking-[.08em] text-fg">EVOLUÇÃO DO MÊS</span>
        <span className="mt-[12px] text-[64px] leading-[72px] font-bold tracking-[-.02em]">
          {d.month.previous.name} x {d.month.current.name.toLowerCase()}
        </span>
        <div className="mt-[64px] grid grid-cols-2 gap-[24px]">
          <div className="flex flex-col items-center gap-[20px]">
            <StoryFigure view="front" height={560} levels={d.month.previous.muscles} />
            <span className="text-[24px] font-semibold tracking-[.08em] text-fg">{d.month.previous.name.toUpperCase()}</span>
          </div>
          <div className="flex flex-col items-center gap-[20px]">
            <StoryFigure view="front" height={560} levels={d.month.current.muscles} />
            <span className="text-[24px] font-semibold tracking-[.08em] text-accent-text">{d.month.current.name.toUpperCase()}</span>
          </div>
        </div>
        <div className="mt-[64px] flex flex-col">
          <div className="flex items-center h-[96px] border-b border-border gap-[24px]">
            <span className="flex-1 text-[30px] text-fg">Treinos</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px] text-fg">{d.month.previous.workouts}</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px]">{d.month.current.workouts}</span>
          </div>
          <div className="flex items-center h-[96px] border-b border-border gap-[24px]">
            <span className="flex-1 text-[30px] text-fg">Volume</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px] text-fg">{d.month.previous.volume}</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px] text-accent-text">{d.month.current.volume}</span>
          </div>
          <div className="flex items-center h-[96px] border-b border-border gap-[24px]">
            <span className="flex-1 text-[30px] text-fg">Grupos treinados</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px] text-fg">{d.month.previous.groups}</span>
            <span className="w-[160px] text-right font-display font-semibold text-[52px]">{d.month.current.groups}</span>
          </div>
        </div>
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}

export function Story27({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
        <div className="flex justify-between items-center h-[48px]">
          <Logo className="h-[88px]" />
          <span className="text-[28px] text-fg">{d.month.current.name}</span>
        </div>
        <span className="mt-[64px] text-[64px] leading-[72px] font-bold tracking-[-.02em]">Músculos do mês</span>
        <div className="mt-[56px] flex justify-center gap-[48px]">
          <StoryFigure view="front" height={440} levels={d.month.current.muscles} />
          <StoryFigure view="back" height={440} levels={d.month.current.muscles} />
        </div>
        <div className="mt-[64px] flex flex-col gap-[28px]">
          {d.month.shares.map((m, i, list) => (
            <div key={m.label} className="grid grid-cols-[240px_minmax(0,1fr)_100px] gap-[24px] items-center">
              <span className="text-[30px]">{m.label}</span>
              <div className="h-[20px] rounded-full bg-surface-3">
                {/* Largura proporcional ao grupo mais treinado (valor dinâmico). */}
                <div
                  className={cn("h-full rounded-full bg-accent", SHARE_OPACITY[Math.min(i, SHARE_OPACITY.length - 1)])}
                  style={{ width: `${Math.round((m.pct / (list[0]?.pct || 1)) * 100)}%` }}
                ></div>
              </div>
              <span className="text-right font-display font-semibold text-[40px]">{m.pct}%</span>
            </div>
          ))}
        </div>
        <span className="mt-[32px] text-[24px] text-fg">{STORY_SIGNATURE}</span>
      </div>
    </>
  );
}
