// Stickers de cardio (Claude Design "PNGs Competicao e Cardio" · K01–K19): tempo, distância, ritmo ou
// velocidade e recorde do treino, com fundo transparente. Os dados vêm de StoryData.cardio e o catálogo só
// oferece o modelo quando o dado existe. Adaptações aos dados reais: médias do treino (o app não guarda
// velocidade máxima nem ritmo de cada km) e sem os modelos que pedem o que o app não registra (calorias,
// inclinação, esforço, ritmo por km, tiros por distância, primeiro 5K, km da semana).
import type { ReactNode } from "react";
import { ChevronsRight, Flame, Timer, Trophy } from "lucide-react";
import type { StoryCardio, StoryData } from "@guf/core";
import { GufRat } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CARDIO_ACTIVITY_ICONS } from "@/shared/constants/cardio-activity-icons";
import { StickerLogo } from "./stickers-a";
import { Card, EchoLines, Eyebrow, Header } from "./bold-sticker-parts";
import type { StoryModelProps } from "@/features/share/type";

/** Velocímetro: escala mínima (km/h) e passo para arredondar o topo quando a velocidade passa dela. */
const SPEEDOMETER_MIN_MAX = 20;
const SPEEDOMETER_STEP = 10;

/** "RITMO /KM" · "KM/H" (rótulo curto embaixo do número). */
function rateCaption(cardio: StoryCardio): string {
  return cardio.rateKind === "pace" ? "RITMO /KM" : "KM/H";
}

/** Bloco de número com rótulo embaixo (tempo, km, ritmo). */
function Stat({ value, label, accent, large, className }: { value: string; label: string; accent?: boolean; large?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-[4px]", className)}>
      <span className={cn("font-display font-bold", large ? "text-[80px] leading-[80px]" : "text-[72px] leading-[72px]", accent && "text-accent-text")}>{value}</span>
      <span className="text-[28px] font-semibold tracking-[.08em] text-fg-secondary">{label}</span>
    </div>
  );
}

/** Só desenha com cardio (o catálogo já filtra; a guarda evita quebrar uma prévia antiga). */
function withCardio(d: StoryData, render: (cardio: StoryCardio) => ReactNode) {
  return d.cardio ? render(d.cardio) : null;
}

/** K01 · Distância em velocidade. */
export function StoryK01({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => {
    const ActivityIcon = CARDIO_ACTIVITY_ICONS[cardio.activity];
    return (
      <Card className="gap-[24px] overflow-hidden">
        <Header
          aside={
            <span className="flex items-center gap-[12px] text-[34px] font-semibold text-fg-secondary">
              <ActivityIcon size={36} aria-hidden="true" />
              {cardio.tag}
            </span>
          }
        />
        <div className="flex items-center gap-[24px]">
          <div className="flex flex-none flex-col gap-[18px]">
            <span className="h-[14px] w-[120px] rounded-full bg-accent" />
            <span className="ml-[48px] h-[14px] w-[72px] rounded-full bg-accent opacity-60" />
            <span className="ml-[20px] h-[14px] w-[100px] rounded-full bg-accent opacity-35" />
          </div>
          <span className="inline-block -skew-x-10 font-display text-[300px] leading-[260px] font-bold tracking-[-.03em]">{cardio.distance}</span>
        </div>
        <span className="ml-[160px] inline-block -skew-x-10 font-display text-[96px] leading-[90px] font-bold tracking-[.02em] text-accent-text">QUILÔMETROS</span>
        <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
          <Stat value={cardio.time} label="TEMPO" className="rounded-[28px] bg-surface-3 px-[32px] py-[28px]" />
          <Stat value={cardio.rate ?? ""} label={rateCaption(cardio)} className="rounded-[28px] bg-surface-3 px-[32px] py-[28px]" />
        </div>
      </Card>
    );
  });
}

const TICKS = Array.from({ length: 60 }, (_, i) => i);

/** K02 · Cronômetro fechado. */
export function StoryK02({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <div className="relative grid size-[760px] place-items-center rounded-full border-2 border-border bg-surface text-fg">
      <svg viewBox="0 0 48 48" className="absolute inset-[48px] size-[calc(100%-96px)] -rotate-90" aria-hidden="true">
        {TICKS.map((i) => (
          <line
            key={i}
            x1="24"
            y1="1.2"
            x2="24"
            y2={i % 5 ? 3.2 : 4.6}
            className="stroke-story-accent"
            strokeWidth={i % 5 ? 0.7 : 1.1}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 24 24)`}
          />
        ))}
      </svg>
      <div className="flex flex-col items-center gap-[8px]">
        <span className="flex items-center gap-[12px] text-[32px] font-semibold tracking-[.08em] text-accent-text">
          <Timer size={36} aria-hidden="true" />
          NO LIMITE
        </span>
        <span className="font-display text-[200px] leading-[190px] font-bold tracking-[-.02em]">{cardio.time}</span>
        <span className="max-w-[560px] truncate text-[38px] font-semibold">{cardio.title}</span>
        <span className="mt-[16px]">
          <StickerLogo />
        </span>
      </div>
    </div>
  ));
}

/** Topo do velocímetro: 20 km/h ou a dezena acima da velocidade. */
function speedometerMax(speed: number): number {
  return Math.max(SPEEDOMETER_MIN_MAX, Math.ceil(speed / SPEEDOMETER_STEP) * SPEEDOMETER_STEP);
}

/** K03 · Velocímetro (velocidade média em km/h). */
export function StoryK03({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => {
    const speed = cardio.speedKmh ?? 0;
    const max = speedometerMax(speed);
    const fraction = Math.min(1, speed / max);
    const angle = Math.PI * (1 - fraction);
    const needleX = (50 + 34 * Math.cos(angle)).toFixed(2);
    const needleY = (52 - 34 * Math.sin(angle)).toFixed(2);
    const speedText = speed.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return (
      <Card className="items-center gap-[8px]">
        <div className="flex items-center justify-between self-stretch">
          <StickerLogo />
          <Eyebrow>VELOCIDADE MÉDIA</Eyebrow>
        </div>
        <div className="relative h-[420px] w-[760px]">
          <svg viewBox="0 0 100 56" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <path d="M8 52A42 42 0 0 1 92 52" fill="none" className="stroke-surface-3" strokeWidth="8" strokeLinecap="round" />
            <path
              d="M8 52A42 42 0 0 1 92 52"
              fill="none"
              className="stroke-accent"
              strokeWidth="8"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${Math.round(fraction * 100)} 100`}
            />
            <line x1="50" y1="52" x2={needleX} y2={needleY} className="stroke-fg" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="50" cy="52" r="4" className="fill-fg" />
          </svg>
          <div className="absolute inset-x-0 bottom-[-10px] flex justify-between px-[4px] font-display text-[34px] font-semibold text-fg-secondary">
            <span>0</span>
            <span>{max}</span>
          </div>
        </div>
        <span className="mt-[24px] flex items-baseline gap-[16px]">
          <span className="inline-block -skew-x-8 font-display text-[220px] leading-[200px] font-bold tracking-[-.02em]">{speedText}</span>
          <span className="font-display text-[72px] font-bold text-accent-text">KM/H</span>
        </span>
        <span className="max-w-full truncate text-[40px] font-semibold">{cardio.title}</span>
      </Card>
    );
  });
}

/** K07 · Faixa diagonal. */
export function StoryK07({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <div className="box-border flex w-[960px] -rotate-4 flex-col gap-[20px] py-[40px] text-fg">
      <div className="flex items-center gap-[20px] self-start rounded-[24px] border-2 border-border bg-surface px-[36px] py-[20px]">
        <StickerLogo />
        <span className="text-[34px] font-semibold">
          {cardio.tag} · {d.date}
        </span>
      </div>
      <div className="flex items-baseline gap-[24px] rounded-[32px] bg-story-accent px-[48px] py-[24px] text-accent-foreground">
        <span className="font-display text-[220px] leading-[200px] font-bold tracking-[-.02em]">{cardio.distance}</span>
        <span className="font-display text-[90px] font-bold">KM</span>
      </div>
      <div className="flex gap-[20px] self-end">
        <Stat value={cardio.time} label="TEMPO" className="rounded-[28px] border-2 border-border bg-surface px-[40px] py-[24px]" large />
        <Stat
          value={cardio.rate ?? ""}
          label={rateCaption(cardio)}
          accent
          large
          className="rounded-[28px] border-2 border-border bg-surface px-[40px] py-[24px]"
        />
      </div>
    </div>
  ));
}

/** Tempo · km · ritmo em três colunas com divisórias (K09). */
function StatRow({ cardio }: { cardio: StoryCardio }) {
  const cells = [
    { value: cardio.time, label: "TEMPO" },
    { value: cardio.distance ?? "", label: "KM" },
    { value: cardio.rate ?? "", label: rateCaption(cardio), accent: true },
  ];
  return (
    <div className="grid grid-cols-3 rounded-[32px] bg-surface-3 px-[12px] py-[36px]">
      {cells.map((cell, i) => (
        <div key={cell.label} className={cn("flex flex-col items-center gap-[4px]", i === 1 && "border-x-2 border-border")}>
          <span className={cn("font-display text-[88px] leading-[88px] font-bold", cell.accent && "text-accent-text")}>{cell.value}</span>
          <span className="text-[28px] font-semibold tracking-[.08em] text-fg-secondary">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}

/** K09 · Suor · Guf Rat. */
export function StoryK09({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <Card className="gap-[32px]">
      <div className="flex items-center gap-[40px]">
        <GufRat occasion="workoutDone" size={320} animated={false} label={null} />
        <div className="flex min-w-0 flex-col gap-[12px]">
          <StickerLogo />
          <span className="text-[80px] leading-[84px] font-bold tracking-[-.02em]">Deixei tudo no cardio</span>
        </div>
      </div>
      <StatRow cardio={cardio} />
    </Card>
  ));
}

/** K11 · Ritmo em chamas (esteira e remo). */
export function StoryK11({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <Card className="gap-[24px]">
      <Header
        aside={
          <Eyebrow>
            {cardio.tag.toUpperCase()} · {cardio.minutes} MIN
          </Eyebrow>
        }
      />
      <div className="flex items-center gap-[24px]">
        <Flame size={240} className="-skew-x-8 text-danger" aria-hidden="true" />
        <span className="inline-block -skew-x-10 font-display text-[280px] leading-[240px] font-bold tracking-[-.03em]">{cardio.rate}</span>
      </div>
      <span className="ml-[40px] inline-block -skew-x-10 font-display text-[110px] leading-[100px] font-bold text-danger">RITMO /KM</span>
      <span className="mt-[16px] text-[40px] leading-[48px] font-semibold">{cardio.distance} km nesse ritmo. E amanhã tem mais.</span>
    </Card>
  ));
}

const SPEED_LINES = [
  { height: "h-[14px]", opacity: "opacity-100", indent: "ml-0" },
  { height: "h-[22px]", opacity: "opacity-80", indent: "ml-[60px]" },
  { height: "h-[14px]", opacity: "opacity-55", indent: "ml-[20px]" },
  { height: "h-[10px]", opacity: "opacity-35", indent: "ml-[100px]" },
  { height: "h-[8px]", opacity: "opacity-20", indent: "ml-[40px]" },
];

/** K12 · Sem freio. */
export function StoryK12({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <div className="box-border flex w-[960px] flex-col gap-[12px] overflow-hidden rounded-[56px] border-2 border-border bg-surface py-[64px] pl-[64px] text-fg">
      <span className="self-start">
        <StickerLogo />
      </span>
      <span className="mt-[24px] inline-block -skew-x-12 font-display text-[120px] leading-[120px] font-bold text-accent-text">SEM FREIO</span>
      <div className="flex items-center gap-[24px]">
        <span className="inline-block -skew-x-12 font-display text-[340px] leading-[280px] font-bold tracking-[-.03em]">{cardio.rate}</span>
        <div className="flex flex-1 flex-col gap-[20px]">
          {SPEED_LINES.map((line, i) => (
            <span key={i} className={cn("rounded-l-full bg-accent", line.height, line.opacity, line.indent)} />
          ))}
        </div>
      </div>
      <span className="font-display text-[80px] font-bold tracking-[.04em]">
        {cardio.rateLabel} {cardio.rateUnit.toUpperCase()}
      </span>
    </div>
  ));
}

/** K14 · Superação: a marca anterior e a de hoje (recorde de cardio). */
export function StoryK14({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => {
    const record = cardio.record;
    if (!record) return null;
    return (
      <Card className="gap-[36px]">
        <Header aside={<Eyebrow className="text-accent-text">SUPERAÇÃO</Eyebrow>} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)] items-center gap-[24px]">
          <div className="flex flex-col gap-[4px] rounded-[32px] bg-surface-3 p-[32px] text-fg-secondary">
            <span className="text-[30px] font-semibold tracking-[.08em]">ANTES</span>
            <span className="font-display text-[110px] leading-[100px] font-bold">{record.previous}</span>
            <span className="text-[30px] font-semibold">{record.unit}</span>
          </div>
          <ChevronsRight size={96} className="text-accent-text" aria-hidden="true" />
          <div className="flex flex-col gap-[4px] rounded-[32px] bg-story-accent p-[32px] text-accent-foreground">
            <span className="text-[30px] font-bold tracking-[.08em]">HOJE</span>
            <span className="font-display text-[150px] leading-[136px] font-bold">{record.value}</span>
            <span className="text-[30px] font-bold">{record.unit}</span>
          </div>
        </div>
        <span className="flex items-baseline gap-[20px]">
          <span className="inline-block -skew-x-8 font-display text-[160px] leading-[140px] font-bold text-accent-text">{record.deltaPct}</span>
          <span className="text-[44px] leading-[50px] font-bold">
            {record.kind === "distance" ? "mais longe" : "mais rápido"}
            <br />
            que a minha melhor marca
          </span>
        </span>
      </Card>
    );
  });
}

/** K18 · Eco: mais rápido. */
export function StoryK18({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => (
    <Card className="overflow-hidden px-[64px] py-[56px]">
      <EchoLines words={["MAIS RÁPIDO", "MAIS RÁPIDO", "MAIS RÁPIDO", "MAIS RÁPIDO", "MAIS LONGE"]} size="cardio" />
      <div className="mt-[32px] flex items-baseline justify-between">
        <StickerLogo />
        <span className="font-display text-[64px] font-bold">
          {cardio.rate} {cardio.rateUnit.toUpperCase()}
        </span>
      </div>
    </Card>
  ));
}

/** K19 · Recorde de cardio (ritmo, velocidade ou distância). */
export function StoryK19({ d }: StoryModelProps) {
  return withCardio(d, (cardio) => {
    const record = cardio.record;
    if (!record) return null;
    return (
      <Card className="gap-[24px] border-[3px] border-story-pr shadow-story-pr-glow">
        <Header
          aside={
            <span className="flex items-center gap-[12px] rounded-full bg-pr px-[24px] py-[10px] text-[32px] font-bold text-accent-foreground">
              <Trophy size={36} aria-hidden="true" />
              RECORDE PESSOAL
            </span>
          }
        />
        <Eyebrow className="text-pr-text">{record.title.toUpperCase()}</Eyebrow>
        <span className="flex items-baseline gap-[20px]">
          <span className="inline-block -skew-x-10 font-display text-[300px] leading-[250px] font-bold tracking-[-.03em]">{record.value}</span>
          <span className="font-display text-[90px] font-bold text-pr-text">{record.unit.toUpperCase()}</span>
        </span>
        <span className="text-[44px] leading-[52px] font-bold">
          {record.kind === "distance" ? "Nunca fui tão longe." : "Nunca fui tão rápido."} <span className="text-pr-text">{record.delta}</span> em relação à
          marca anterior.
        </span>
      </Card>
    );
  });
}
