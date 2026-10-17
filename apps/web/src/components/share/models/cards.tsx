// Stories e feed · Cartões de resumo (Claude Design · ShareCard). Quatro modelos em dois formatos:
// stories 1080 × 1920 (área útil 96 / 220 / 96 / 260) e feed 1080 × 1350 (margem 72). Dados de StoryData.
import { formatNumber, type StoryData } from "@guf/core";
import { Trophy } from "lucide-react";
import { GufRat, Logo } from "@/components/ds";
import { StoryFigure } from "../story-figure";
import type { StoryModelProps } from "../story-types";

type CardModel = 1 | 2 | 3 | 4;
type CardFormat = "story" | "feed";

interface StatPart {
  value: string;
  unit: string;
}

interface Stat {
  label: string;
  parts: StatPart[];
  accent?: boolean;
}

/** Até 6 exercícios na lista; o resto vira "+N exercícios". */
const MAX_ROWS = 6;
/** Até 3 recordes cabem nos cartões. */
const MAX_RECORDS = 3;
const LEVEL_OPACITY = { 1: "opacity-36", 2: "opacity-64", 3: "" } as const;

const plural = (n: number, one: string, many: string) => (n === 1 ? `${n} ${one}` : `${n} ${many}`);

/** Textos e números derivados que os quatro modelos compartilham. */
function cardValues(d: StoryData) {
  const volumeZero = d.volume === "0";
  const reps = formatNumber(d.reps, 0);
  const duration: StatPart[] = d.durationParts.map((p) => ({ value: p.value, unit: p.unit }));
  const volumeParts: StatPart[] = volumeZero ? [{ value: reps, unit: "" }] : [{ value: d.volume, unit: d.unit }];
  const volumeLabel = volumeZero ? "REPETIÇÕES" : "VOLUME";
  const exercisesLabel = d.exerciseCount === 1 ? "EXERCÍCIO" : "EXERCÍCIOS";
  const extra = d.exercises.length - MAX_ROWS;
  const extraRecords = d.records.length - MAX_RECORDS;
  return {
    title: d.title || "Treino livre",
    volumeZero,
    rows: d.exercises.slice(0, MAX_ROWS),
    moreLabel: extra > 0 ? `+${plural(extra, "exercício", "exercícios")}` : null,
    records: d.records.slice(0, MAX_RECORDS),
    recordsMore: extraRecords > 0 ? `+${plural(extraRecords, "recorde", "recordes")}` : null,
    hasRecord: d.records.length > 0,
    recordBadge: plural(d.records.length, "recorde", "recordes"),
    recordOverline: d.records.length === 1 ? "RECORDE PESSOAL" : "RECORDES PESSOAIS",
    recordTitle: d.records.length === 1 ? "1 recorde quebrado" : `${d.records.length} recordes quebrados`,
    heroLabel: volumeZero ? "REPETIÇÕES TOTAIS" : "VOLUME TOTAL",
    heroValue: volumeZero ? reps : d.volume,
    heroUnit: volumeZero ? "reps" : d.unit,
    /** Modelos 1: tempo, volume (volt), séries e exercícios. */
    stats1: [
      { label: "TEMPO", parts: duration },
      { label: volumeLabel, parts: volumeParts, accent: true },
      { label: "SÉRIES", parts: [{ value: String(d.sets), unit: "" }] },
      { label: exercisesLabel, parts: [{ value: String(d.exerciseCount), unit: "" }] },
    ] satisfies Stat[],
    /** Modelo 2 (o volume já está no destaque): tempo, exercícios, séries e repetições (ou carga "—"). */
    stats2: [
      { label: "TEMPO", parts: duration },
      { label: exercisesLabel, parts: [{ value: String(d.exerciseCount), unit: "" }] },
      { label: "SÉRIES", parts: [{ value: String(d.sets), unit: "" }] },
      volumeZero ? { label: "CARGA", parts: [{ value: "—", unit: "" }] } : { label: "REPETIÇÕES", parts: [{ value: reps, unit: "" }] },
    ] satisfies Stat[],
    /** Modelo 4: tempo, volume (volt) e séries. */
    stats4: [
      { label: "TEMPO", parts: duration },
      { label: volumeLabel, parts: volumeParts, accent: true },
      { label: "SÉRIES", parts: [{ value: String(d.sets), unit: "" }] },
    ] satisfies Stat[],
  };
}

type CardValues = ReturnType<typeof cardValues>;

/** Tamanho do número do destaque (modelo 2) pela quantidade de caracteres. */
function heroSizeClass(value: string, feed: boolean): string {
  if (value.length <= 6) return feed ? "text-[200px]" : "text-[240px]";
  if (value.length === 7) return feed ? "text-[168px]" : "text-[200px]";
  return feed ? "text-[140px]" : "text-[168px]";
}

/* ---------------------------------------------------------------------
 * Peças comuns
 * --------------------------------------------------------------------- */

function DateHeader({ d, feed }: { d: StoryData; feed: boolean }) {
  return (
    <div className={`flex items-center justify-between self-stretch ${feed ? "h-[40px]" : "h-[48px]"}`}>
      <Logo className="h-[88px]" />
      <span className={`${feed ? "text-[32px]" : "text-[34px]"} text-fg`}>{d.date}</span>
    </div>
  );
}

function RecordBadge({ label, feed, className = "" }: { label: string; feed: boolean; className?: string }) {
  return (
    <div
      className={`flex items-center rounded-full border-[2px] border-pr-text/50 bg-pr/14 font-semibold text-pr-text ${
        feed ? "h-[48px] gap-[10px] px-[20px] text-[30px]" : "h-[56px] gap-[12px] px-[24px] text-[32px]"
      } ${className}`}
    >
      <Trophy size={feed ? 30 : 34} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function StatBlock({
  stat,
  valueClass,
  unitClass,
  labelClass,
  gapClass,
  center = false,
}: {
  stat: Stat;
  valueClass: string;
  unitClass: string;
  labelClass: string;
  gapClass: string;
  center?: boolean;
}) {
  return (
    <div className={`flex flex-col ${gapClass} ${center ? "items-center" : ""}`}>
      <div className={`flex items-baseline gap-[4px] ${stat.accent ? "text-accent-text" : "text-fg"}`}>
        {stat.parts.map((p, i) => (
          <span key={i} className="contents">
            <span className={`font-display font-semibold ${valueClass}`}>{p.value}</span>
            {p.unit && <span className={`font-medium text-fg ${unitClass}`}>{p.unit}</span>}
          </span>
        ))}
      </div>
      <span className={`font-semibold tracking-[.08em] text-fg ${labelClass}`}>{stat.label}</span>
    </div>
  );
}

function MuscleLegend({ d, feed }: { d: StoryData; feed: boolean }) {
  return d.muscleLegend.map((m) => (
    <div key={m.label} className={`flex items-center ${feed ? "gap-[10px]" : "gap-[12px]"}`}>
      <span
        className={`bg-accent-text ${LEVEL_OPACITY[m.level]} ${
          feed ? "h-[20px] w-[20px] rounded-[6px]" : "h-[24px] w-[24px] rounded-[8px]"
        }`}
      ></span>
      <span className={`${feed ? "text-[30px]" : "text-[34px]"} text-fg`}>{m.label}</span>
    </div>
  ));
}

function Figure({ d, view, feed }: { d: StoryData; view: "front" | "back"; feed: boolean }) {
  return (
    <div className={`flex flex-col items-center ${feed ? "gap-[12px]" : "gap-[16px]"}`}>
      <StoryFigure view={view} height={feed ? 320 : 400} levels={d.muscles} />
      <span className={`font-semibold tracking-[.08em] text-fg ${feed ? "text-[26px]" : "text-[28px]"}`}>
        {view === "front" ? "FRENTE" : "COSTAS"}
      </span>
    </div>
  );
}

function Load({ d, ex, feed }: { d: StoryData; ex: StoryData["exercises"][number]; feed: boolean }) {
  const small = feed ? "text-[28px]" : "text-[30px]";
  if (ex.loadValue === null) return <span className={`${small} text-fg`}>Peso corporal</span>;
  return (
    <>
      <span className="font-display text-[36px] font-semibold">{ex.loadValue}</span>
      <span className={`ml-[6px] ${small} text-fg`}>{d.unit}</span>
    </>
  );
}

function MoreRow({ label, feed }: { label: string | null; feed: boolean }) {
  if (!label) return null;
  return <div className={`flex items-center text-fg ${feed ? "h-[56px] text-[30px]" : "h-[64px] text-[34px]"}`}>{label}</div>;
}

/* ---------------------------------------------------------------------
 * Modelo 1 · Resumo com boneco
 * --------------------------------------------------------------------- */

function SummaryFigures({ d, v, feed, withRat }: { d: StoryData; v: CardValues; feed: boolean; withRat: boolean }) {
  return (
    <div className="flex h-full flex-col *:shrink-0">
      <div className={`flex items-center justify-between ${feed ? "h-[40px]" : "h-[48px]"}`}>
        <span className={`font-semibold tracking-[.08em] text-accent-text ${feed ? "text-[30px]" : "text-[34px]"}`}>
          TREINO CONCLUÍDO
        </span>
        <Logo className="h-[88px]" />
      </div>
      <div
        className={`line-clamp-2 font-bold tracking-[-.02em] ${
          feed ? "mt-[20px] text-[52px] leading-[60px]" : "mt-[24px] text-[64px] leading-[72px]"
        }`}
      >
        {v.title}
      </div>
      <div
        className={`flex items-center justify-between gap-[24px] ${feed ? "mt-[12px] min-h-[48px]" : "mt-[16px] min-h-[56px]"}`}
      >
        <span className={`${feed ? "text-[34px]" : "text-[36px]"} text-fg`}>{d.date}</span>
        {v.hasRecord && <RecordBadge label={v.recordBadge} feed={feed} />}
      </div>

      {feed ? (
        <div className="mt-[40px] flex items-center gap-[56px]">
          <div className="flex gap-[24px]">
            <Figure d={d} view="front" feed />
            <Figure d={d} view="back" feed />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[40px]">
            <div className="flex flex-wrap gap-x-[32px] gap-y-[12px]">
              <MuscleLegend d={d} feed />
            </div>
            <div className="grid grid-cols-2 gap-x-[24px] gap-y-[32px]">
              {v.stats1.map((s) => (
                <StatBlock
                  key={s.label}
                  stat={s}
                  valueClass="text-[64px] leading-[64px]"
                  unitClass="mr-[6px] text-[30px]"
                  labelClass="text-[26px]"
                  gapClass="gap-[6px]"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-[40px] flex items-end justify-center gap-[48px]">
            <Figure d={d} view="front" feed={false} />
            <Figure d={d} view="back" feed={false} />
            {withRat && (
              <div className="mb-[40px]">
                <GufRat occasion="tip" size={260} animated={false} label={null} />
              </div>
            )}
          </div>
          <div className="mt-[24px] flex flex-wrap justify-center gap-x-[40px] gap-y-[16px]">
            <MuscleLegend d={d} feed={false} />
          </div>
          <div className="mt-[40px] flex justify-between border-t border-border pt-[32px]">
            {v.stats1.map((s) => (
              <StatBlock
                key={s.label}
                stat={s}
                valueClass="text-[72px] leading-[72px]"
                unitClass="mr-[8px] text-[34px]"
                labelClass="text-[28px]"
                gapClass="gap-[8px]"
              />
            ))}
          </div>
        </>
      )}

      <div className={`mt-[40px] flex flex-col ${feed ? "border-t border-border" : ""}`}>
        {v.rows.map((ex) => (
          <div
            key={ex.name}
            className={`flex items-center border-b border-border ${feed ? "h-[56px] gap-[20px]" : "h-[64px] gap-[24px]"}`}
          >
            <span className={`min-w-0 flex-1 truncate ${feed ? "text-[34px]" : "text-[36px]"}`}>{ex.name}</span>
            {ex.isRecord && <Trophy size={feed ? 30 : 34} aria-hidden="true" className="flex-none text-pr-text" />}
            <span className={`text-right font-display text-[36px] font-semibold text-fg ${feed ? "min-w-[104px]" : "min-w-[112px]"}`}>
              {ex.scheme}
            </span>
            <span className={`text-right ${feed ? "min-w-[168px]" : "min-w-[176px]"}`}>
              <Load d={d} ex={ex} feed={feed} />
            </span>
          </div>
        ))}
        <MoreRow label={v.moreLabel} feed={feed} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Modelo 2 · Volume em destaque com tabela
 * --------------------------------------------------------------------- */

function SummaryVolume({ d, v, feed }: { d: StoryData; v: CardValues; feed: boolean }) {
  const cols = feed
    ? { sets: "w-[88px]", reps: "w-[96px]", load: "w-[184px]" }
    : { sets: "w-[96px]", reps: "w-[104px]", load: "w-[200px]" };
  return (
    <div className="flex h-full flex-col">
      <DateHeader d={d} feed={feed} />
      <div
        className={`line-clamp-2 font-bold tracking-[-.02em] ${
          feed ? "mt-[40px] text-[44px] leading-[52px]" : "mt-[64px] text-[52px] leading-[60px]"
        }`}
      >
        {v.title}
      </div>
      <span className={`font-semibold tracking-[.08em] text-fg ${feed ? "mt-[40px] text-[30px]" : "mt-[80px] text-[34px]"}`}>
        {v.heroLabel}
      </span>
      <div className={`flex items-baseline ${feed ? "mt-[20px] gap-[12px]" : "mt-[24px] gap-[16px]"}`}>
        <span
          className={`font-display font-bold leading-[.9] tracking-[-.01em] text-accent-text ${heroSizeClass(v.heroValue, feed)}`}
        >
          {v.heroValue}
        </span>
        <span className={`font-display font-semibold text-fg ${feed ? "text-[72px]" : "text-[88px]"}`}>{v.heroUnit}</span>
      </div>
      <div
        className={`grid grid-cols-4 gap-[24px] border-t border-border ${feed ? "mt-[40px] pt-[24px]" : "mt-[64px] pt-[32px]"}`}
      >
        {v.stats2.map((s) => (
          <StatBlock
            key={s.label}
            stat={s}
            valueClass={feed ? "text-[56px] leading-[56px]" : "text-[64px] leading-[64px]"}
            unitClass={`mr-[6px] ${feed ? "text-[28px]" : "text-[32px]"}`}
            labelClass={feed ? "text-[26px]" : "text-[28px]"}
            gapClass={feed ? "gap-[6px]" : "gap-[8px]"}
          />
        ))}
      </div>
      <div className={`flex flex-col ${feed ? "mt-[40px]" : "mt-[64px]"}`}>
        <div
          className={`flex items-center border-b-[2px] border-border-strong font-semibold tracking-[.08em] text-fg ${
            feed ? "h-[40px] gap-[20px] text-[26px]" : "h-[48px] gap-[24px] text-[28px]"
          }`}
        >
          <span className="flex-1">EXERCÍCIO</span>
          <span className={`text-right ${cols.sets}`}>SÉRIES</span>
          <span className={`text-right ${cols.reps}`}>REPS</span>
          <span className={`text-right ${cols.load}`}>CARGA</span>
        </div>
        {v.rows.map((ex) => (
          <div
            key={ex.name}
            className={`flex items-center border-b border-border ${feed ? "h-[56px] gap-[20px]" : "h-[64px] gap-[24px]"}`}
          >
            <span className={`min-w-0 flex-1 truncate ${feed ? "text-[32px]" : "text-[34px]"}`}>{ex.name}</span>
            <span className={`text-right font-display text-[36px] font-semibold text-fg ${cols.sets}`}>{ex.setCount}</span>
            <span className={`text-right font-display text-[36px] font-semibold text-fg ${cols.reps}`}>{ex.reps ?? "—"}</span>
            <span className={`text-right ${cols.load}`}>
              <Load d={d} ex={ex} feed={feed} />
            </span>
          </div>
        ))}
        <MoreRow label={v.moreLabel} feed={feed} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Modelo 3 · Recordes (só com recorde)
 * --------------------------------------------------------------------- */

function SummaryRecords({ d, v, feed }: { d: StoryData; v: CardValues; feed: boolean }) {
  if (!v.hasRecord) return null;
  return (
    <div className="flex h-full flex-col">
      <DateHeader d={d} feed={feed} />
      {feed ? (
        <div className="mt-[32px] flex items-center gap-[40px]">
          <div className="relative flex h-[280px] w-[280px] flex-none items-center justify-center">
            <div className="absolute left-[-80px] top-[-80px] h-[440px] w-[440px] rounded-full bg-radial from-pr/24 to-transparent to-62%"></div>
            <div className="relative">
              <GufRat occasion="personalRecord" size={260} animated={false} label={null} />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
            <div className="flex items-center gap-[10px] text-[30px] font-semibold tracking-[.08em] text-pr-text">
              <Trophy size={34} aria-hidden="true" />
              <span>{v.recordOverline}</span>
            </div>
            <div className="text-[56px] font-bold leading-[64px] tracking-[-.02em]">{v.recordTitle}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-[32px] flex h-[360px] items-center justify-center">
            <div className="absolute left-1/2 top-1/2 ml-[-300px] mt-[-300px] h-[600px] w-[600px] rounded-full bg-radial from-pr/24 to-transparent to-62%"></div>
            <div className="relative">
              <GufRat occasion="personalRecord" size={340} animated={false} label={null} />
            </div>
          </div>
          <div className="mt-[24px] flex items-center justify-center gap-[12px] text-[34px] font-semibold tracking-[.08em] text-pr-text">
            <Trophy size={36} aria-hidden="true" />
            <span>{v.recordOverline}</span>
          </div>
          <div className="mt-[16px] text-center text-[64px] font-bold leading-[72px] tracking-[-.02em]">{v.recordTitle}</div>
        </>
      )}

      <div className={`flex flex-col ${feed ? "mt-[40px] gap-[16px]" : "mt-[48px] gap-[24px]"}`}>
        {v.records.map((r) => {
          const previous = r.previousLoad ? `vs. ${r.previousLoad} ${d.unit}` : null;
          const delta = (
            <div className="flex flex-col items-end gap-[8px]">
              <span
                className={`flex items-center rounded-full bg-pr font-display font-bold text-pr-foreground ${
                  feed ? "h-[48px] px-[18px] text-[38px]" : "h-[56px] px-[20px] text-[40px]"
                }`}
              >
                {r.delta}
              </span>
              {previous && <span className={`${feed ? "text-[28px]" : "text-[32px]"} text-fg`}>{previous}</span>}
            </div>
          );
          const load = (
            <div className="flex items-baseline gap-[8px] text-pr-text">
              <span className={`font-display font-bold ${feed ? "text-[88px] leading-[80px]" : "text-[112px] leading-[96px]"}`}>
                {r.load}
              </span>
              <span className={`font-display font-semibold ${feed ? "text-[36px]" : "text-[44px]"}`}>{d.unit}</span>
            </div>
          );
          return feed ? (
            <div
              key={r.exerciseName}
              className="flex items-center justify-between gap-[24px] rounded-[24px] border-[2px] border-pr-text/36 bg-surface px-[32px] py-[24px]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="truncate text-[32px] font-semibold text-fg">{r.exerciseName}</span>
                {load}
              </div>
              {delta}
            </div>
          ) : (
            <div
              key={r.exerciseName}
              className="flex flex-col gap-[12px] rounded-[32px] border-[2px] border-pr-text/36 bg-surface px-[40px] py-[32px]"
            >
              <span className="truncate text-[34px] font-semibold text-fg">{r.exerciseName}</span>
              <div className="flex items-end justify-between gap-[24px]">
                {load}
                {delta}
              </div>
            </div>
          );
        })}
      </div>
      {v.recordsMore && (
        <div className={`text-center text-fg ${feed ? "mt-[16px] text-[30px]" : "mt-[24px] text-[34px]"}`}>{v.recordsMore}</div>
      )}
      <div className={`mt-auto truncate text-center text-fg ${feed ? "text-[30px]" : "text-[34px]"}`}>{v.title}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Modelo 4 · Treino finalizado (Guf Rat)
 * --------------------------------------------------------------------- */

function SummaryRat({ d, v, feed }: { d: StoryData; v: CardValues; feed: boolean }) {
  return (
    <div className="flex h-full flex-col items-center">
      <DateHeader d={d} feed={feed} />
      <div
        className={`flex items-center justify-center rounded-full border border-border bg-surface ${
          feed ? "mt-[32px] h-[520px] w-[520px]" : "mt-[64px] h-[720px] w-[720px]"
        }`}
      >
        <GufRat occasion="loadUp" size={feed ? 408 : 560} animated={false} label={null} />
      </div>
      <div
        className={`font-extrabold tracking-[-.03em] ${feed ? "mt-[40px] text-[72px] leading-[76px]" : "mt-[56px] text-[84px] leading-[88px]"}`}
      >
        Treino finalizado.
      </div>
      <div className={`max-w-full truncate text-fg ${feed ? "mt-[12px] text-[34px]" : "mt-[16px] text-[36px]"}`}>{v.title}</div>
      <div className={`flex justify-center ${feed ? "mt-[40px] gap-[64px]" : "mt-[64px] gap-[72px]"}`}>
        {v.stats4.map((s) => (
          <StatBlock
            key={s.label}
            stat={s}
            center
            valueClass={feed ? "text-[64px] leading-[64px]" : "text-[80px] leading-[80px]"}
            unitClass={`mr-[6px] ${feed ? "text-[30px]" : "text-[34px]"}`}
            labelClass={feed ? "text-[26px]" : "text-[28px]"}
            gapClass={feed ? "gap-[6px]" : "gap-[8px]"}
          />
        ))}
      </div>
      {v.hasRecord && <RecordBadge label={v.recordBadge} feed={feed} className={feed ? "mt-[32px]" : "mt-[48px]"} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Cartão (área útil por formato) e exports
 * --------------------------------------------------------------------- */

function SummaryCard({ d, model, format, withRat = false }: { d: StoryData; model: CardModel; format: CardFormat; withRat?: boolean }) {
  const feed = format === "feed";
  const v = cardValues(d);
  return (
    <div
      className={`absolute flex flex-col text-left text-fg ${
        feed ? "inset-[72px]" : "left-[96px] right-[96px] top-[220px] bottom-[260px]"
      }`}
    >
      {model === 1 && <SummaryFigures d={d} v={v} feed={feed} withRat={withRat} />}
      {model === 2 && <SummaryVolume d={d} v={v} feed={feed} />}
      {model === 3 && <SummaryRecords d={d} v={v} feed={feed} />}
      {model === 4 && <SummaryRat d={d} v={v} feed={feed} />}
    </div>
  );
}

export const StoryC01 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={1} format="story" />;
export const StoryC02 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={2} format="story" />;
export const StoryC03 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={3} format="story" />;
export const StoryC04 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={4} format="story" />;
export const StoryC05 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={1} format="story" withRat />;
export const StoryC06 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={2} format="story" withRat />;
export const StoryC07 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={3} format="story" withRat />;
export const StoryC08 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={4} format="story" withRat />;
export const StoryC09 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={1} format="feed" />;
export const StoryC10 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={2} format="feed" />;
export const StoryC11 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={3} format="feed" />;
export const StoryC12 = ({ d }: StoryModelProps) => <SummaryCard d={d} model={4} format="feed" />;
