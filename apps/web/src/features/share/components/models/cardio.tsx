// Stories · Cardio. Sem protótipo próprio: segue o card de cardio do treino (Claude Design "Treino Cardio" +
// "CardioCard": ícone do aparelho, anel do guf com o tempo, Tempo · Km · Ritmo) e a moldura dos outros
// modelos. Arte fixa 1080 × 1920; os dados vêm de StoryData.cardio (o catálogo só oferece com cardio).
import { Trophy } from "lucide-react";
import type { StoryCardio, StoryCardioExercise } from "@guf/core";
import { Logo } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CARDIO_ACTIVITY_ICONS } from "@/shared/constants/cardio-activity-icons";
import { STORY_SIGNATURE, type StoryModelProps } from "@/features/share/type";

/** Até 3 exercícios cabem na tabela sem empurrar a assinatura. */
const MAX_TABLE_ROWS = 3;
const RING_SIZE = 480;
const RING_RADIUS = 212;
const RING_STROKE = 28;
/** Arco quase fechado, como o anel do cronômetro do cardio (o ponto marca o fim). */
const RING_ARC = 0.9;
const TABLE_GRID = "grid grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.3fr)] items-center gap-[16px]";

export function StoryCardio01({ d }: StoryModelProps) {
  const cardio = d.cardio;
  if (!cardio) return null;
  const ActivityIcon = CARDIO_ACTIVITY_ICONS[cardio.activity];

  return (
    <div className="absolute left-[96px] right-[96px] top-[220px] bottom-[260px] flex flex-col">
      <div className="flex h-[88px] items-center justify-between">
        <Logo className="h-[88px]" />
        <span className="text-[28px] text-fg">{d.date}</span>
      </div>

      <div className="mt-[64px] flex items-center gap-[24px]">
        <span className="grid size-[88px] flex-none place-items-center rounded-[28px] bg-accent text-accent-foreground">
          <ActivityIcon size={48} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-[4px]">
          <span className="text-[26px] font-semibold tracking-[.08em] text-accent-text">CARDIO · {cardio.tag.toUpperCase()}</span>
          <span className="truncate text-[56px] leading-[64px] font-bold tracking-[-.02em]">{cardio.title}</span>
        </div>
      </div>

      <CardioTimeRing time={cardio.time} />
      <CardioStats cardio={cardio} />
      {cardio.record ? <CardioRecordCard record={cardio.record} /> : cardio.exercises.length > 1 && <CardioTable exercises={cardio.exercises} />}

      <span className="mt-auto pt-[32px] text-center text-[24px] text-fg">{STORY_SIGNATURE}</span>
    </div>
  );
}

function CardioTimeRing({ time }: { time: string }) {
  const circumference = 2 * Math.PI * RING_RADIUS;
  const center = RING_SIZE / 2;
  const endAngle = RING_ARC * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="relative mt-[40px] size-[480px] self-center">
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="block" aria-hidden="true">
        <circle cx={center} cy={center} r={RING_RADIUS} fill="none" className="stroke-surface-3" strokeWidth={RING_STROKE} />
        <circle
          cx={center}
          cy={center}
          r={RING_RADIUS}
          fill="none"
          className="stroke-accent"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference * RING_ARC} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle cx={center + RING_RADIUS * Math.cos(endAngle)} cy={center + RING_RADIUS * Math.sin(endAngle)} r={22} className="fill-accent" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[8px]">
        <span className="text-[26px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
        <span className="font-display text-[140px] leading-[130px] font-bold tabular-nums">{time}</span>
      </div>
    </div>
  );
}

/** Distância e desempenho do treino; sem distância registrada, só o aviso de que o tempo é o total. */
function CardioStats({ cardio }: { cardio: StoryCardio }) {
  if (!cardio.distance) {
    return <span className="mt-[48px] text-center text-[30px] text-fg">Tempo total de cardio</span>;
  }
  return (
    <div className="mt-[40px] grid grid-cols-2 gap-[24px]">
      <StatCard label="DISTÂNCIA" value={cardio.distance} unit="km" />
      <StatCard label={cardio.rateLabel} value={cardio.rate ?? "—"} unit={cardio.rateUnit} isHighlighted />
    </div>
  );
}

function StatCard({ label, value, unit, isHighlighted = false }: { label: string; value: string; unit: string; isHighlighted?: boolean }) {
  return (
    <div className="flex flex-col gap-[8px] rounded-[40px] border-[2px] border-border bg-surface px-[40px] py-[36px]">
      <span className="text-[22px] font-semibold tracking-[.08em] text-fg">{label}</span>
      <span className="flex items-baseline gap-[12px]">
        <span className={cn("font-display text-[104px] leading-[100px] font-bold tabular-nums", isHighlighted && "text-accent-text")}>
          {value}
        </span>
        <span className="font-display text-[40px] font-semibold text-fg">{unit}</span>
      </span>
    </div>
  );
}

function CardioRecordCard({ record }: { record: NonNullable<StoryCardio["record"]> }) {
  return (
    <div className="mt-[24px] flex items-center gap-[32px] rounded-[40px] border-[2px] border-pr-text/40 bg-surface px-[40px] py-[32px] shadow-story-pr">
      <span className="grid size-[88px] flex-none place-items-center rounded-full bg-pr-highlight text-pr-text">
        <Trophy size={44} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="text-[22px] font-semibold tracking-[.08em] text-pr-text">RECORDE · {record.title.toUpperCase()}</span>
        <span className="truncate text-[30px] text-fg">
          {record.exerciseName} · antes {record.previous} {record.unit}
        </span>
      </div>
      <span className="flex flex-none flex-col items-end">
        <span className="font-display text-[72px] leading-[72px] font-bold tabular-nums text-pr-text">{record.value}</span>
        <span className="text-[24px] font-semibold text-fg">{record.unit}</span>
      </span>
    </div>
  );
}

/** Um exercício por linha, como a tabela do card de cardio (Tempo · Km · Ritmo ou km/h). */
function CardioTable({ exercises }: { exercises: readonly StoryCardioExercise[] }) {
  return (
    <div className="mt-[24px] flex flex-col rounded-[40px] border-[2px] border-border bg-surface px-[40px] py-[28px]">
      <div className={`${TABLE_GRID} pb-[12px] text-[20px] font-semibold tracking-[.08em] text-fg`}>
        <span>EXERCÍCIO</span>
        <span className="text-right">TEMPO</span>
        <span className="text-right">KM</span>
        <span className="text-right">MÉDIA</span>
      </div>
      {exercises.slice(0, MAX_TABLE_ROWS).map((exercise) => (
        <CardioTableRow key={exercise.name} exercise={exercise} />
      ))}
    </div>
  );
}

function CardioTableRow({ exercise }: { exercise: StoryCardioExercise }) {
  const Icon = CARDIO_ACTIVITY_ICONS[exercise.activity];
  return (
    <div className={`${TABLE_GRID} border-t-[2px] border-border py-[16px] text-[28px]`}>
      <span className="flex min-w-0 items-center gap-[14px]">
        <Icon size={32} className="flex-none text-accent-text" aria-hidden="true" />
        <span className="truncate font-semibold">{exercise.name}</span>
      </span>
      <span className="text-right font-display text-[40px] font-semibold tabular-nums">{exercise.time}</span>
      <span className="text-right font-display text-[40px] font-semibold tabular-nums">{exercise.distance ?? "—"}</span>
      <span className="text-right font-display text-[40px] font-semibold tabular-nums">
        {exercise.rate ? `${exercise.rate} ${exercise.rateUnit}` : "—"}
      </span>
    </div>
  );
}
