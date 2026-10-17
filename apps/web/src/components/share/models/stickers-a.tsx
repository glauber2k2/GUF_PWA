// Stickers S01–S11 (Claude Design · StoryArt "Stickers"): só a forma do adesivo, largura fixa do design e
// altura automática. O StoryArt envolve com folga, tema e fundo transparente; os dados vêm de StoryData.
import type { ReactNode } from "react";
import { Check, Timer, Trophy } from "lucide-react";
import { plural, type StoryData, type StoryMuscle } from "@guf/core";
import { GufRat, Logo, MuscleIcon, StreakFlame } from "@/components/ds";
import { cn } from "@/lib/utils";
import { StoryFigure } from "../story-figure";
import { STORY_DOMAIN, STORY_SIGNATURE_LEAD, type StoryModelProps } from "../story-types";

/* ---------------------------------------------------------------------
 * Partes comuns (também usadas em stickers-b.tsx)
 * --------------------------------------------------------------------- */

/** Forma padrão do adesivo: cartão com borda; largura e alinhamento vêm de `className`. */
export function StickerCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col rounded-[48px] border-[3px] border-border-strong bg-surface text-fg", className)}>{children}</div>;
}

export function StickerLogo() {
  return <Logo className="h-[84px]" />;
}

/** Logo à esquerda e um texto curto à direita (data, rótulo). */
export function StickerHeader({ aside }: { aside: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-[16px]">
      <StickerLogo />
      <span className="text-[30px] font-semibold text-fg">{aside}</span>
    </div>
  );
}

export function StickerSignature({ className }: { className?: string }) {
  return (
    <span className={cn("text-[28px] font-semibold text-fg", className)}>
      {STORY_SIGNATURE_LEAD} <span className="text-accent-text">{STORY_DOMAIN}</span>
    </span>
  );
}

export function StickerTagline() {
  return (
    <span className="text-[30px] font-bold tracking-[-.01em] text-fg">
      <span className="text-accent-text">GUF</span> te ajudando a evoluir
    </span>
  );
}

/** "12 semanas seguidas" · "1 semana seguida" (a sequência do app é em semanas). */
export function streakLabel(weeks: number): string {
  return weeks === 1 ? "semana seguida" : "semanas seguidas";
}

/** Grupos mais treinados (maior nível primeiro), para os ícones de músculo. */
export function topMuscles(d: StoryData, count: number): StoryMuscle[] {
  return (Object.entries(d.muscles) as Array<[StoryMuscle, 1 | 2 | 3]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([muscle]) => muscle);
}

/** "4 × 10 · 60 kg" (só o esquema quando não há carga). */
function schemeWithLoad(e: StoryData["exercises"][number]): string {
  return e.loadValue === null ? e.scheme : `${e.scheme} · ${e.loadShort}`;
}

/* ---------------------------------------------------------------------
 * Modelos
 * --------------------------------------------------------------------- */

/** S01 · Streak em pílula. */
export function StoryS01({ d }: StoryModelProps) {
  return (
    <div className="flex h-[300px] w-[780px] items-center gap-[32px] rounded-full border-[3px] border-border-strong bg-surface pr-[64px] pl-[40px] text-fg">
      <div className="flex size-[216px] flex-none items-center justify-center rounded-full bg-accent/16 text-accent-text">
        <StreakFlame size={132} />
      </div>
      <div className="flex min-w-0 flex-col gap-[10px]">
        <StickerLogo />
        <div className="flex items-baseline gap-[14px]">
          <span className="font-display text-[104px] leading-[96px] font-bold">{d.streak.current}</span>
          <span className="text-[34px] font-bold">{streakLabel(d.streak.current)}</span>
        </div>
        <StickerSignature className="text-[24px]" />
      </div>
    </div>
  );
}

/** S02 · Streak em selo redondo. */
export function StoryS02({ d }: StoryModelProps) {
  return (
    <div className="flex size-[580px] flex-col items-center justify-center gap-[4px] rounded-full border-[6px] border-accent bg-surface text-center text-fg">
      <StickerLogo />
      <div className="mt-[12px] flex items-center gap-[8px] text-accent-text">
        <StreakFlame size={96} />
        <span className="font-display text-[180px] leading-[150px] font-bold text-fg">{d.streak.current}</span>
      </div>
      <span className="text-[34px] font-bold tracking-[.08em]">{streakLabel(d.streak.current).toUpperCase()}</span>
      <span className="mt-[18px] text-[28px] leading-[30px] font-semibold text-fg">
        {STORY_SIGNATURE_LEAD}
        <br />
        <span className="text-accent-text">{STORY_DOMAIN}</span>
      </span>
    </div>
  );
}

/** S03 · Semana de treinos (domingo a sábado). */
export function StoryS03({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[780px] gap-[28px] p-[44px]">
      <StickerHeader aside={`Semana ${d.streak.weekNumber}`} />
      <span className="text-[52px] leading-[58px] font-bold tracking-[-.02em]">{plural(d.week.count, "treino", "treinos")} nesta semana</span>
      <div className="grid grid-cols-7 justify-items-center gap-[10px]">
        {d.week.days.map((day, i) => (
          <div key={i} className={cn("flex flex-col items-center gap-[10px]", day.future && "opacity-50")}>
            {day.trained ? (
              <div className="flex size-[76px] items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Check size={36} strokeWidth={3} aria-hidden="true" />
              </div>
            ) : (
              <div className="size-[76px] rounded-full bg-surface-3" />
            )}
            <span className="text-[30px] font-semibold text-fg">{day.initial}</span>
          </div>
        ))}
      </div>
      <StickerSignature />
      <StickerTagline />
    </StickerCard>
  );
}

/** S04 · Ficha de treino (até 6 exercícios). */
export function StoryS04({ d }: StoryModelProps) {
  const muscles = topMuscles(d, 2);
  return (
    <StickerCard className="w-[660px] gap-[24px] p-[44px]">
      <StickerLogo />
      <div className="flex items-center gap-[20px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <span className="text-[28px] font-bold tracking-[.08em] text-accent-text">FICHA DE TREINO</span>
          <span className="text-[42px] leading-[48px] font-bold tracking-[-.02em]">{d.title}</span>
        </div>
        {muscles.length > 0 && (
          <div className="flex flex-none gap-[8px]">
            {muscles.map((m) => (
              <div key={m} className="flex size-[96px] items-center justify-center rounded-[24px] bg-surface-3">
                <MuscleIcon muscle={m} size={80} zoom animate="none" label="" />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        {d.exercises.slice(0, 6).map((e, i) => (
          <div key={i} className="flex h-[76px] items-center justify-between gap-[16px] border-t-[2px] border-border">
            <span className="min-w-0 truncate text-[34px] font-semibold">{e.name}</span>
            <span className="flex-none font-display text-[38px] font-semibold">
              <span>{e.scheme}</span>
              {e.loadValue !== null && (
                <>
                  <span className="text-fg"> · </span>
                  <span className="font-bold text-accent-text">{e.loadShort}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** S05 · Ficha com boneco de costas (4 exercícios). */
export function StoryS05({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[720px] gap-[24px] p-[44px]">
      <StickerHeader aside={d.date} />
      <div className="flex items-center gap-[28px]">
        <div className="flex-none">
          <StoryFigure view="back" height={360} levels={d.muscles} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[20px]">
          <span className="text-[40px] leading-[46px] font-bold tracking-[-.02em]">{d.focus}</span>
          {d.exercises.slice(0, 4).map((e, i) => (
            <div key={i} className="flex flex-col gap-[6px]">
              <span className="text-[32px] font-semibold">{e.name}</span>
              <span className="font-display text-[38px] font-semibold text-accent-text">{schemeWithLoad(e)}</span>
            </div>
          ))}
        </div>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** S06 · Volume total. */
export function StoryS06({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[620px] items-center gap-[8px] px-[40px] pt-[48px] pb-[40px] text-center">
      <StickerLogo />
      <span className="mt-[28px] text-[32px] font-bold tracking-[.08em] text-fg">VOLUME TOTAL</span>
      <span className="font-display text-[176px] leading-[156px] font-bold text-accent-text">{d.volume}</span>
      <span className="text-[38px] font-semibold">{d.unit} levantados no treino</span>
      <span className="text-[32px] text-fg">{d.title}</span>
      <StickerSignature className="mt-[20px]" />
      <StickerTagline />
    </StickerCard>
  );
}

/** S07 · Tempo de treino. */
export function StoryS07({ d }: StoryModelProps) {
  const details = [plural(d.sets, "série", "séries"), d.restAverage && `descanso médio ${d.restAverage}`].filter(Boolean).join(" · ");
  return (
    <StickerCard className="w-[620px] gap-[12px] p-[44px]">
      <div className="flex items-center justify-between">
        <StickerLogo />
        <div className="flex size-[72px] items-center justify-center rounded-[20px] bg-surface-3 text-accent-text">
          <Timer size={40} aria-hidden="true" />
        </div>
      </div>
      <span className="mt-[12px] font-display text-[200px] leading-[176px] font-bold tracking-[-.01em]">{d.duration}</span>
      <span className="text-[36px] font-semibold">de treino · {d.focus}</span>
      <span className="text-[32px] text-fg">{details}</span>
      <StickerSignature className="mt-[12px]" />
    </StickerCard>
  );
}

function Metric({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <span className={cn("font-display text-[64px] leading-[64px] font-bold", accent && "text-accent-text")}>{value}</span>
      <span className="text-[26px] font-bold tracking-[.08em] text-fg">{label}</span>
    </div>
  );
}

/** S08 · Métricas + boneco de frente. */
export function StoryS08({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[760px] gap-[28px] p-[44px]">
      <StickerHeader aside={d.date} />
      <div className="flex items-center gap-[32px]">
        <div className="flex-none">
          <StoryFigure view="front" height={340} levels={d.muscles} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[20px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-[28px] font-bold tracking-[.08em] text-accent-text">TREINO CONCLUÍDO</span>
            <span className="text-[38px] leading-[44px] font-bold">{d.focus}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-[16px] gap-y-[20px]">
            <Metric value={d.duration} label="TEMPO" />
            <Metric value={d.volume} label={d.unit.toUpperCase()} accent />
            <Metric value={d.sets} label="SÉRIES" />
            <Metric value={d.reps} label="REPS" />
          </div>
        </div>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** "+5 kg desde 12 set" (sem "desde" quando não há data da marca anterior). */
function recordDelta(r: StoryData["records"][number]): string {
  return r.previousDate ? `${r.delta} desde ${r.previousDate}` : r.delta;
}

/** S09 · Recorde dourado (primeiro recorde do treino). */
export function StoryS09({ d }: StoryModelProps) {
  const r = d.records[0];
  if (!r) return null;
  return (
    <div className="flex w-[620px] flex-col items-center gap-[8px] rounded-[48px] border-[4px] border-pr bg-surface px-[40px] pt-[44px] pb-[40px] text-center text-fg shadow-sticker-pr">
      <StickerLogo />
      <div className="mt-[28px] flex size-[128px] items-center justify-center rounded-[36px] bg-pr/18 text-pr-text shadow-sticker-trophy">
        <Trophy size={72} aria-hidden="true" />
      </div>
      <span className="mt-[20px] text-[32px] font-bold tracking-[.08em] text-pr-text">RECORDE PESSOAL</span>
      <span className="text-[40px] font-bold">{r.exerciseName}</span>
      <div className="flex items-baseline gap-[10px]">
        <span className="font-display text-[160px] leading-[144px] font-bold">{r.load}</span>
        <span className="font-display text-[56px] font-semibold text-fg">{d.unit}</span>
      </div>
      <span className="text-[34px] font-semibold text-pr-text">{recordDelta(r)}</span>
      <StickerSignature className="mt-[20px]" />
      <StickerTagline />
    </div>
  );
}

/** S10 · Recorde com o Guf Rat. */
export function StoryS10({ d }: StoryModelProps) {
  const r = d.records[0];
  if (!r) return null;
  return (
    <StickerCard className="w-[740px] gap-[16px] px-[44px] py-[40px]">
      <StickerLogo />
      <div className="flex items-center gap-[20px]">
        <div className="flex-none">
          <GufRat occasion="personalRecord" size={240} animated={false} label={null} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <div className="flex items-center gap-[10px] text-pr-text">
            <Trophy size={34} aria-hidden="true" />
            <span className="text-[30px] font-bold tracking-[.08em]">RECORDE PESSOAL</span>
          </div>
          <span className="text-[36px] leading-[42px] font-bold">{r.exerciseName}</span>
          <div className="flex items-baseline gap-[8px]">
            <span className="font-display text-[136px] leading-[124px] font-bold">{r.load}</span>
            <span className="font-display text-[48px] font-semibold text-fg">{d.unit}</span>
          </div>
        </div>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** S11 · Treino concluído com o Guf Rat. */
export function StoryS11({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[600px] items-center gap-[8px] px-[40px] pt-[44px] pb-[40px] text-center">
      <StickerLogo />
      <div className="mt-[12px]">
        <GufRat occasion="workoutDone" size={300} animated={false} label={null} />
      </div>
      <span className="font-display text-[88px] leading-[84px] font-bold text-accent-text">Treino concluído</span>
      <span className="text-[34px] text-fg">{[d.focus, d.duration, plural(d.sets, "série", "séries")].join(" · ")}</span>
      <StickerSignature className="mt-[16px]" />
      <StickerTagline />
    </StickerCard>
  );
}
