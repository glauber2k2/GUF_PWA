// Stickers S12–S22, sem o S21 (igual ao modelo Comparação de peso) (Claude Design · StoryArt "Stickers"): só a forma do adesivo, largura fixa do design e
// altura automática. O StoryArt envolve com folga, tema e fundo transparente; os dados vêm de StoryData.
import { formatNumber, plural } from "@guf/core";
import { GufRat, MuscleIcon, type MuscleIconKey } from "@/shared/components/ds";
import { MuscleFigure } from "@/shared/components/ds";
import type { StoryModelProps } from "@/features/share/type";
import { StickerCard, StickerHeader, StickerLogo, StickerSignature, StickerTagline } from "./stickers-a";

/** Treino de perna pelo nome do foco (pose "Dia de perna" do Guf Rat). */
const LEG_FOCUS = /perna|quadr[ií]ceps|gl[úu]teo|posterior|panturrilha|flexora|extensora/i;

/** S12 · Dia de … (qualquer treino) com o Guf Rat e os bonecos. */
export function StoryS12({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[720px] gap-[20px] p-[44px]">
      <StickerHeader aside={d.date} />
      <span className="text-[52px] leading-[58px] font-bold tracking-[-.02em]">
        Hoje foi dia de <span className="text-accent-text">{d.focus}</span>
      </span>
      <div className="flex items-end justify-between">
        <div className="flex gap-[10px]">
          <MuscleFigure view="front" height={320} levels={d.muscles} />
          <MuscleFigure view="back" height={320} levels={d.muscles} />
        </div>
        <GufRat occasion={LEG_FOCUS.test(d.focus) ? "legDay" : "workoutDone"} size={260} animated={false} label={null} />
      </div>
      <div className="flex flex-wrap gap-x-[32px] gap-y-[8px]">
        <div className="flex items-baseline gap-[8px]">
          <span className="font-display text-[60px] leading-[60px] font-bold text-accent-text">{d.volume}</span>
          <span className="text-[32px] text-fg">{d.unit}</span>
        </div>
        <div className="flex items-baseline gap-[8px]">
          <span className="font-display text-[60px] leading-[60px] font-bold">{d.sets}</span>
          <span className="text-[32px] text-fg">{d.sets === 1 ? "série" : "séries"}</span>
        </div>
        <span className="font-display text-[60px] leading-[60px] font-bold">{d.duration}</span>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** Nome do grupo (StoryData.topMuscle.label) → ícone de músculo. */
const MUSCLE_ICON_BY_LABEL: Record<string, MuscleIconKey> = {
  Peito: "peito",
  Ombro: "ombro",
  Costas: "costas",
  Trapézio: "trapezio",
  Abdômen: "abdomen",
  Bíceps: "biceps",
  Tríceps: "triceps",
  Antebraço: "antebraco",
  Glúteos: "gluteos",
  Quadríceps: "quadriceps",
  Posterior: "posterior",
  Panturrilha: "panturrilha",
};

/** S13 · Músculo do dia (grupo com mais séries). */
export function StoryS13({ d }: StoryModelProps) {
  const top = d.topMuscle;
  if (!top) return null;
  const icon = MUSCLE_ICON_BY_LABEL[top.label];
  return (
    <StickerCard className="w-[560px] items-center gap-[8px] px-[40px] pt-[44px] pb-[40px] text-center">
      <StickerLogo />
      {icon && (
        <div className="mt-[24px] flex size-[300px] items-center justify-center rounded-[64px] bg-surface-3">
          <MuscleIcon muscle={icon} size={260} zoom animate="none" label="" />
        </div>
      )}
      <span className="mt-[20px] text-[30px] font-bold tracking-[.08em] text-accent-text">MÚSCULO DO DIA</span>
      <span className="font-display text-[104px] leading-[96px] font-bold">{top.label}</span>
      <span className="text-[34px] text-fg">
        {plural(top.exercises, "exercício", "exercícios")} · {plural(top.sets, "série", "séries")}
      </span>
      <StickerSignature className="mt-[16px]" />
    </StickerCard>
  );
}

/** S14 · Mapa muscular da semana (frente e costas). */
export function StoryS14({ d }: StoryModelProps) {
  const legend = [
    { label: "Muito", className: "bg-accent-text" },
    { label: "Médio", className: "bg-accent-text/64" },
    { label: "Pouco", className: "bg-accent-text/36" },
  ];
  return (
    <StickerCard className="w-[680px] gap-[24px] p-[44px]">
      <StickerHeader aside="Esta semana" />
      <span className="text-[48px] leading-[54px] font-bold tracking-[-.02em]">Músculos treinados</span>
      <div className="flex justify-center gap-[40px]">
        <MuscleFigure view="front" height={400} levels={d.week.muscles} />
        <MuscleFigure view="back" height={400} levels={d.week.muscles} />
      </div>
      <div className="flex justify-center gap-[28px]">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-[10px]">
            <span className={`size-[26px] rounded-[8px] ${item.className}`} />
            <span className="text-[30px] font-semibold text-fg">{item.label}</span>
          </div>
        ))}
      </div>
      <StickerSignature className="text-center" />
    </StickerCard>
  );
}

/** Área do gráfico do 1RM (viewBox fixo do design). */
const CHART = { width: 692, height: 220, left: 12, right: 680, top: 28, bottom: 196 };

/** Pontos do gráfico com os valores normalizados entre o menor e o maior. */
function chartPoints(values: readonly number[]): Array<{ x: number; y: number }> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = values.length > 1 ? (CHART.right - CHART.left) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? CHART.left + i * step : CHART.right,
    y: max === min ? (CHART.top + CHART.bottom) / 2 : CHART.bottom - ((v - min) / (max - min)) * (CHART.bottom - CHART.top),
  }));
}

/** S15 · Evolução do 1RM estimado do exercício em destaque. */
export function StoryS15({ d }: StoryModelProps) {
  const f = d.featured;
  if (!f) return null;
  const points = chartPoints(f.oneRms);
  const last = points[points.length - 1];
  const delta = f.oneRmDelta.replace(` ${d.unit}`, "");
  return (
    <StickerCard className="w-[780px] gap-[20px] p-[44px]">
      <div className="flex items-center justify-between">
        <StickerLogo />
        <span className="text-[30px] font-bold tracking-[.08em] text-fg">1RM EST.</span>
      </div>
      <div className="flex items-end justify-between gap-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <span className="text-[40px] font-bold">{f.exerciseName}</span>
          <span className="text-[32px] text-fg">últimas 8 semanas</span>
        </div>
        <div className="flex flex-none items-baseline gap-[6px]">
          <span className="font-display text-[96px] leading-[88px] font-bold text-accent-text">{delta}</span>
          <span className="text-[36px] text-fg">{d.unit}</span>
        </div>
      </div>
      <svg width={CHART.width} height={CHART.height} viewBox={`0 0 ${CHART.width} ${CHART.height}`} aria-hidden="true" className="block overflow-visible">
        {[10, 110, 210].map((y) => (
          <line key={y} x1={0} y1={y} x2={CHART.width} y2={y} strokeWidth={2} className="stroke-border" />
        ))}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          strokeWidth={7}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-data"
        />
        {points.slice(0, -1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={10} className="fill-data" />
        ))}
        {last && <circle cx={last.x} cy={last.y} r={16} strokeWidth={5} className="fill-accent stroke-surface" />}
      </svg>
      <div className="flex justify-between text-[30px] text-fg">
        <span>
          {f.oneRmFirst} {d.unit}
        </span>
        <span>
          {f.oneRmNow} {d.unit}
        </span>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** Circunferência do anel da meta (raio 140). */
const RING = 2 * Math.PI * 140;

/** S16 · Meta da semana em anel. */
export function StoryS16({ d }: StoryModelProps) {
  const { count, goal, goalProgress, remaining } = d.week;
  if (!goal) return null;
  const progress = Math.max(0, Math.min(1, goalProgress));
  const status = remaining <= 0 ? "Meta cumprida" : remaining === 1 ? "Falta 1 treino" : `Faltam ${remaining} treinos`;
  return (
    <StickerCard className="w-[580px] items-center gap-[12px] px-[40px] pt-[44px] pb-[40px] text-center">
      <StickerLogo />
      <div className="mt-[20px] grid size-[340px]">
        <svg width={340} height={340} viewBox="0 0 340 340" aria-hidden="true" className="col-start-1 row-start-1 block">
          <circle cx={170} cy={170} r={140} fill="none" strokeWidth={32} className="stroke-surface-3" />
          {progress > 0 && (
            <circle
              cx={170}
              cy={170}
              r={140}
              fill="none"
              strokeWidth={32}
              strokeLinecap="round"
              // Traço proporcional ao progresso da meta (valor dinâmico).
              strokeDasharray={`${progress * RING} ${RING}`}
              transform="rotate(-90 170 170)"
              className="stroke-accent-text"
            />
          )}
        </svg>
        <div className="col-start-1 row-start-1 flex items-baseline justify-center pt-[96px]">
          <span className="font-display text-[150px] leading-[130px] font-bold">{count}</span>
          <span className="font-display text-[80px] font-semibold text-fg">/{goal}</span>
        </div>
      </div>
      <span className="mt-[12px] text-[40px] font-bold">Meta da semana</span>
      <span className="text-[34px] text-fg">{status}</span>
      <StickerSignature className="mt-[12px]" />
      <StickerTagline />
    </StickerCard>
  );
}

function Dashed() {
  return <div className="border-t-[3px] border-dashed border-border-strong" />;
}

/** S17 · Recibo do treino (borda de baixo picotada). */
export function StoryS17({ d }: StoryModelProps) {
  return (
    <div className="flex w-[600px] flex-col gap-[20px] rounded-t-[32px] bg-surface px-[44px] pt-[48px] pb-[76px] text-fg [mask:radial-gradient(circle_16px_at_50%_100%,transparent_97%,#000_100%)_0_0/40px_100%_repeat-x]">
      <div className="flex justify-center">
        <StickerLogo />
      </div>
      <div className="flex flex-col items-center gap-[4px]">
        <span className="text-[30px] font-bold tracking-[.08em]">RECIBO DO TREINO</span>
        <span className="text-[30px] text-fg">{d.dateTime}</span>
      </div>
      <Dashed />
      {d.exercises.slice(0, 8).map((e, i) => (
        <div key={i} className="flex justify-between gap-[16px]">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[32px] font-semibold">{e.name}</span>
            <span className="text-[28px] text-fg">{e.loadValue === null ? e.scheme : `${e.scheme} × ${e.loadShort}`}</span>
          </div>
          <span className="flex-none font-display text-[38px] font-semibold">{e.volume}</span>
        </div>
      ))}
      <Dashed />
      <div className="flex items-baseline justify-between">
        <span className="text-[32px] font-bold tracking-[.08em]">TOTAL</span>
        <span className="font-display text-[64px] leading-[64px] font-bold text-accent-text">
          {d.volume} {d.unit}
        </span>
      </div>
      <div className="flex justify-between text-[30px] text-fg">
        <span>Tempo {d.duration}</span>
        <span>{plural(d.sets, "série", "séries")}</span>
        <span>{plural(d.reps, "rep", "reps")}</span>
      </div>
      <Dashed />
      <StickerSignature className="text-center" />
    </div>
  );
}

/** S18 · Descanso médio com o Guf Rat. */
export function StoryS18({ d }: StoryModelProps) {
  if (!d.restAverage) return null;
  return (
    <StickerCard className="w-[720px] gap-[12px] px-[44px] py-[40px]">
      <StickerLogo />
      <div className="flex items-center gap-[24px]">
        <div className="flex-none">
          <GufRat occasion="rest" size={220} animated={false} label={null} />
        </div>
        <div className="flex flex-col gap-[4px]">
          <span className="text-[30px] font-bold tracking-[.08em] text-info">DESCANSO MÉDIO</span>
          <span className="font-display text-[150px] leading-[136px] font-bold">{d.restAverage}</span>
          <span className="text-[34px] text-fg">entre as séries do treino</span>
        </div>
      </div>
      <StickerSignature />
    </StickerCard>
  );
}

/** S19 · Marco de treinos registrados com o Guf Rat. */
export function StoryS19({ d }: StoryModelProps) {
  const { total, since } = d.milestone;
  return (
    <StickerCard className="w-[600px] items-center gap-[6px] px-[40px] pt-[44px] pb-[40px] text-center">
      <StickerLogo />
      <div className="mt-[8px]">
        <GufRat occasion="goalReached" size={240} animated={false} label={null} />
      </div>
      <span className="font-display text-[200px] leading-[170px] font-bold text-accent-text">{formatNumber(total, 0)}</span>
      <span className="text-[34px] font-bold tracking-[.08em]">{total === 1 ? "TREINO REGISTRADO" : "TREINOS REGISTRADOS"}</span>
      {since && <span className="text-[32px] text-fg">desde {since}</span>}
      <StickerSignature className="mt-[16px]" />
      <StickerTagline />
    </StickerCard>
  );
}

function StackedNumber({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <span className="text-[32px] font-semibold text-fg">{label}</span>
      <div className="flex items-baseline gap-[8px]">
        <span className={accent ? "font-display text-[92px] leading-[88px] font-bold text-accent-text" : "font-display text-[92px] leading-[88px] font-bold"}>
          {value}
        </span>
        {unit && <span className="font-display text-[40px] font-semibold text-fg">{unit}</span>}
      </div>
    </div>
  );
}

/** S20 · Números empilhados + bonecos. */
export function StoryS20({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[600px] items-center gap-[22px] px-[40px] pt-[48px] pb-[40px] text-center">
      <StackedNumber label="Peso levantado" value={d.volume} unit={d.unit} accent />
      <StackedNumber label="Duração" value={d.duration} />
      <StackedNumber label="Séries" value={d.sets} />
      <div className="mt-[8px] flex gap-[28px]">
        <MuscleFigure view="front" height={300} levels={d.muscles} />
        <MuscleFigure view="back" height={300} levels={d.muscles} />
      </div>
      <div className="mt-[8px]">
        <StickerLogo />
      </div>
      <StickerSignature />
      <StickerTagline />
    </StickerCard>
  );
}

/** S22 · Ficha lateral + bonecos. */
export function StoryS22({ d }: StoryModelProps) {
  return (
    <StickerCard className="w-[760px] gap-[24px] p-[44px]">
      <div className="flex gap-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <span className="text-[30px] font-semibold text-fg">{d.date}</span>
          <span className="mt-[32px] text-[48px] leading-[54px] font-bold tracking-[-.02em]">{d.title}</span>
          <span className="font-display text-[36px] font-semibold text-accent-text">
            {d.volume} {d.unit} · {d.duration}
          </span>
          <div className="mt-[16px] flex flex-col gap-[14px]">
            {d.exercises.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-baseline gap-[12px]">
                <span className="flex-none font-display text-[38px] font-bold text-accent-text">{e.setCount} ×</span>
                <span className="text-[33px] leading-[34px] font-semibold">{e.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-none flex-col gap-[20px]">
          <MuscleFigure view="front" height={300} levels={d.muscles} />
          <MuscleFigure view="back" height={300} levels={d.muscles} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-[16px]">
        <StickerLogo />
        <StickerSignature className="text-[24px]" />
      </div>
    </StickerCard>
  );
}
