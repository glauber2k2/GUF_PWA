"use client";

import { formatShortDate, fromLocalISODate, type RankedCompetitor } from "@guf/core";
import { Avatar } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { firstName } from "@/features/competition/components/position-card";

export interface RaceLine {
  competitor: RankedCompetitor;
  values: number[];
}

/** Arredonda o topo do eixo para um número "redondo" acima do maior valor. */
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * power >= value * 1.05) ?? 10;
  return step * power;
}

/** Distância mínima (em % da altura) entre as fotos na ponta das linhas. */
const ENDPOINT_GAP = 14;
/** Quantas pessoas do topo mostram a foto, além de você e do adversário. */
const TOP_WITH_PHOTO = 4;

function spreadEndpoints(items: Array<{ id: string; y: number }>): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    if (sorted[i]!.y < prev.y + ENDPOINT_GAP) sorted[i]!.y = prev.y + ENDPOINT_GAP;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const limit = i === sorted.length - 1 ? 100 : sorted[i + 1]!.y - ENDPOINT_GAP;
    if (sorted[i]!.y > limit) sorted[i]!.y = limit;
  }
  return new Map(sorted.map((e) => [e.id, e.y]));
}

/** Corrida: valor acumulado de cada pessoa no período. Você em volt, o adversário em azul, o resto neutro. */
/**
 * Foto no fim da linha da corrida: com `onSelect` (tela geral), tocar troca o adversário do 1×1;
 * sem ele (duelo, ou a sua), é só imagem. Nunca abre o perfil: o gráfico é para comparar.
 */
function RaceEndpointAvatar({ competitor, isRival, onSelect }: { competitor: RankedCompetitor; isRival: boolean; onSelect?: () => void }) {
  const avatar = <Avatar src={competitor.avatarUrl} name={competitor.name ?? competitor.handle} size="sm" className="size-6 text-[11px]" />;
  if (!onSelect) return avatar;
  return (
    <button
      type="button"
      aria-label={`Comparar com ${firstName(competitor)}`}
      aria-pressed={isRival}
      onClick={onSelect}
      // Foto de 24 px: a área de toque cresce até 44 px sem mudar o desenho.
      className="relative grid cursor-pointer rounded-pill outline-none after:absolute after:-inset-2.5 after:content-[''] focus-visible:shadow-focus"
    >
      {avatar}
    </button>
  );
}

export function RaceChart({
  lines,
  dates,
  rivalId,
  caption,
  format,
  onSelect,
}: {
  lines: RaceLine[];
  dates: string[];
  rivalId: string | null;
  caption: string;
  format: (value: number) => string;
  /** Tocar na foto de alguém troca o adversário do 1×1 (tela geral); sem ela (duelo), a foto é só imagem. */
  onSelect?: (userId: string) => void;
}) {
  const n = Math.max(1, dates.length);
  const max = niceMax(Math.max(0, ...lines.map((l) => l.values.at(-1) ?? 0)));
  const point = (value: number, i: number) => `${(((i + 1) / n) * 100).toFixed(2)},${(100 - (value / max) * 100).toFixed(2)}`;
  const highlighted = (c: RankedCompetitor) => c.isMe || c.userId === rivalId;
  const ordered = [...lines].sort((a, b) => Number(highlighted(a.competitor)) - Number(highlighted(b.competitor)) || Number(a.competitor.isMe) - Number(b.competitor.isMe));
  const withPhoto = lines.filter((l) => highlighted(l.competitor) || l.competitor.rank <= TOP_WITH_PHOTO);
  const ends = spreadEndpoints(withPhoto.map((l) => ({ id: l.competitor.userId, y: 100 - ((l.values.at(-1) ?? 0) / max) * 100 })));
  const tickIndexes = n <= 3 ? dates.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  const rival = lines.find((l) => l.competitor.userId === rivalId)?.competitor;
  const lineColor = (c: RankedCompetitor) => (c.isMe ? "stroke-accent-text" : c.userId === rivalId ? "stroke-data" : "stroke-border-strong");
  const dotColor = (c: RankedCompetitor) => (c.isMe ? "bg-accent" : c.userId === rivalId ? "bg-data" : "bg-border-strong");

  return (
    <section aria-label="Corrida" className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface px-4 pt-5 pb-4 shadow-e1">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">Corrida</h2>
        <span className="text-[13px] leading-[18px] text-fg-muted">{caption} · toque numa pessoa do ranking para comparar</span>
      </div>
      <figure className="relative m-0 h-[216px] pt-2 pr-10 pb-[22px]">
        <div className="relative size-full">
          {[1, 0.5, 0].map((f) => (
            // Posição das linhas de grade (dinâmica).
            <div key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${100 - f * 100}%` }}>
              {f > 0 && <span className="absolute -top-[15px] left-0 text-[10px] text-fg-muted tabular-nums">{format(max * f)}</span>}
            </div>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" role="img" aria-label={caption}>
            {ordered.map(({ competitor, values }) => (
              <path
                key={competitor.userId}
                d={`M0,100 L${values.map((v, i) => point(v, i)).join(" L")}`}
                fill="none"
                strokeWidth={highlighted(competitor) ? 3 : 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={cn(lineColor(competitor), !highlighted(competitor) && "opacity-90")}
              />
            ))}
          </svg>
          {withPhoto.map(({ competitor }) => (
            <span
              key={competitor.userId}
              className={cn("absolute left-[calc(100%+20px)] grid -translate-x-1/2 -translate-y-1/2 rounded-pill p-0.5 transition-[top] duration-300", dotColor(competitor))}
              style={{ top: `${(ends.get(competitor.userId) ?? 0).toFixed(2)}%` }}
            >
              <RaceEndpointAvatar
                competitor={competitor}
                isRival={competitor.userId === rivalId}
                onSelect={onSelect && !competitor.isMe ? () => onSelect(competitor.userId) : undefined}
              />
            </span>
          ))}
          {tickIndexes.map((i, k) => (
            <span
              key={i}
              className={cn(
                "absolute -bottom-5 text-[11px] whitespace-nowrap text-fg-muted",
                k === 0 && tickIndexes.length > 1 ? "-translate-x-[30%]" : k === tickIndexes.length - 1 ? "-translate-x-[80%]" : "-translate-x-1/2",
              )}
              style={{ left: `${(((i + 1) / n) * 100).toFixed(2)}%` }}
            >
              {formatShortDate(fromLocalISODate(dates[i] ?? "")).split(", ")[1]}
            </span>
          ))}
        </div>
      </figure>
      <div className="flex flex-wrap gap-3.5 px-1 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-[2px] bg-accent-text" />
          Você
        </span>
        {rival && (
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-[2px] bg-data" />
            {firstName(rival)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-[2px] bg-border-strong" />
          Outras pessoas
        </span>
      </div>
    </section>
  );
}
