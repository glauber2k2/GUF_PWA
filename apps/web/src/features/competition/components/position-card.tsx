"use client";

import { ChevronDown, ChevronUp, ChevronsUp, Dumbbell, Minus, Zap } from "lucide-react";
import { rankLabel, rankMovement, workoutsToCover, type CompetitionMetric, type RankedCompetitor } from "@guf/core";
import { Avatar, Button, GufRat, Icon } from "@/shared/components/ds";
import { CompetitorAvatar } from "@/features/competition/components/competitor-avatar";
import { cn } from "@/shared/helpers/class-names";
import { useAppShell } from "@/features/app-shell";

export function firstName(competitor: Pick<RankedCompetitor, "name" | "handle" | "isMe">): string {
  if (competitor.isMe) return "Você";
  return competitor.name?.split(" ")[0] ?? `@${competitor.handle}`;
}

/** "Subiu 2" · "Caiu 1" · "Manteve". */
export function movementOf(competitor: RankedCompetitor) {
  const diff = rankMovement(competitor);
  if (diff > 0) return { icon: ChevronUp, text: `Subiu ${diff}`, chipClass: "bg-accent/16 text-accent-text", iconClass: "text-accent-text" };
  if (diff < 0) return { icon: ChevronDown, text: `Caiu ${-diff}`, chipClass: "bg-surface-3 text-fg-secondary", iconClass: "text-fg-secondary" };
  return { icon: Minus, text: "Manteve", chipClass: "bg-surface-3 text-fg-muted", iconClass: "text-fg-muted" };
}

/** Sua posição: quanto falta para passar quem está à frente, quem vem atrás e "Treinar agora". */
export function PositionCard({
  ranking,
  metric,
  unit,
  format,
}: {
  ranking: RankedCompetitor[];
  metric: CompetitionMetric;
  unit: string;
  format: (value: number) => string;
}) {
  const { openStartSheet } = useAppShell();
  const meIndex = ranking.findIndex((c) => c.isMe);
  const me = ranking[meIndex];
  if (!me) return null;
  const above = ranking.slice(0, meIndex).reverse().find((c) => c.value > me.value) ?? null;
  const below = ranking.slice(meIndex + 1).find((c) => c.value < me.value) ?? null;
  const second = ranking.find((c) => !c.isMe);
  const move = movementOf(me);
  const gap = above ? above.value - me.value : 0;
  const needed = above ? workoutsToCover(gap + (metric === "volume" ? 0 : 1), metric, me.totals) : null;
  const pct = above && above.value > 0 ? Math.max(4, Math.min(100, (me.value / above.value) * 100)) : 0;

  return (
    <section aria-label="Sua posição" className="flex flex-col gap-4 rounded-lg border-[1.5px] border-accent-text bg-surface p-5 shadow-e1">
      <div className="flex items-center gap-3.5">
        <span className="grid rounded-pill border-2 border-accent p-[3px]">
          <Avatar src={me.avatarUrl} name={me.name ?? me.handle} size="lg" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Sua posição</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[56px] leading-[56px] font-bold tracking-[-0.01em] tabular-nums">{rankLabel(me.rank)}</span>
            <span className="text-sm text-fg-muted">de {ranking.length} {ranking.length === 1 ? "pessoa" : "pessoas"}</span>
          </div>
        </div>
        <span className={cn("flex h-[26px] items-center gap-1 self-start rounded-pill px-2.5 text-xs font-bold whitespace-nowrap", move.chipClass)}>
          <Icon icon={move.icon} size={13} />
          {move.text}
        </span>
      </div>

      {me.rank === 1 && second && (
        <div className="flex items-center gap-3 rounded-md bg-accent/10 p-3.5">
          <GufRat occasion="goalReached" size={56} animated={false} label="" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[15px] leading-5">Você está na frente</strong>
            <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">
              {firstName(second)} está a {format(me.value - second.value)} {unit}. Treine para manter a liderança.
            </span>
          </div>
        </div>
      )}

      {above && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] text-fg-secondary">Faltam para passar {firstName(above)}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[40px] leading-10 font-semibold text-accent-text tabular-nums">{format(gap + (metric === "volume" ? 0 : 1))}</span>
                <span className="text-sm text-fg-muted">{unit}</span>
              </div>
            </div>
            <CompetitorAvatar competitor={above} size="md" />
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-pill bg-surface-3">
            {/* Largura proporcional ao valor de cada um (dinâmico). */}
            <span className="absolute inset-y-0 left-0 rounded-pill bg-accent transition-[width] duration-300 ease-standard" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs leading-4 text-fg-muted tabular-nums">
            <span>Você · {format(me.value)}</span>
            <span>
              {firstName(above)} · {format(above.value)}
            </span>
          </div>
          {needed !== null && needed > 0 && (
            <div className="flex items-center gap-2 text-sm leading-5">
              <span className="grid size-6 flex-none place-items-center rounded-pill bg-accent text-accent-foreground">
                <Icon icon={Zap} size={14} />
              </span>
              <span className="text-pretty">
                <strong className="font-semibold">{needed === 1 ? "Mais 1 treino" : `Mais ${needed} treinos`}</strong> e você assume o {rankLabel(above.rank)} lugar.
              </span>
            </div>
          )}
        </div>
      )}

      {below && (
        <div className="flex items-center gap-2.5 border-t border-border pt-3.5">
          <CompetitorAvatar competitor={below} size="sm" />
          <span className="flex-1 text-[13px] leading-[18px] text-pretty text-fg-secondary">
            <strong className="font-semibold text-fg">{firstName(below)}</strong> está a {format(me.value - below.value)} {unit} de você. Não deixe passar.
          </span>
          <span className="grid size-7 flex-none place-items-center rounded-pill bg-warning/16 text-warning">
            <Icon icon={ChevronsUp} size={16} />
          </span>
        </div>
      )}

      <Button variant="primary" size="lg" icon={Dumbbell} fullWidth onClick={openStartSheet}>
        Treinar agora
      </Button>
    </section>
  );
}
