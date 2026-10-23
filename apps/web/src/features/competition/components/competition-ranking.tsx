"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, Crown } from "lucide-react";
import { formatNumber, metricValue, rankLabel, type CompetitorTotals, type RankedCompetitor } from "@guf/core";
import { Avatar, BottomSheet, Icon, StreakFlame } from "@/shared/components/ds";
import { CompetitorAvatar } from "@/features/competition/components/competitor-avatar";
import { cn } from "@/shared/helpers/class-names";
import { firstName, movementOf } from "@/features/competition/components/position-card";

/** Pódio: 2º, 1º e 3º com degraus de alturas diferentes. */
export function Podium({ ranking, label, format }: { ranking: RankedCompetitor[]; label: string; format: (value: number) => string }) {
  const order = [ranking[1], ranking[0], ranking[2]];
  const heights = ["h-[72px]", "h-[100px]", "h-[52px]"];
  return (
    <section aria-label="Pódio" className="flex flex-col gap-3.5 overflow-hidden rounded-lg border border-border bg-surface px-4 pt-5 shadow-e1">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">Pódio</h2>
        <span className="text-[13px] text-fg-muted">{label}</span>
      </div>
      <div className="grid grid-cols-3 items-end gap-2">
        {order.map((c, i) =>
          c ? (
            <div key={c.userId} className="flex min-w-0 flex-col items-center gap-2">
              <div className="relative grid place-items-center pt-[18px]">
                {i === 1 && <Icon icon={Crown} size={22} className="absolute top-0 text-accent-text" />}
                <span className={cn("grid rounded-pill border-2 p-0.5", c.isMe ? "border-accent" : i === 1 ? "border-accent-text" : "border-transparent")}>
                  <CompetitorAvatar competitor={c} size={i === 1 ? "lg" : "md"} />
                </span>
              </div>
              <div className="flex w-full min-w-0 flex-col items-center">
                <span className="max-w-full truncate text-[13px] leading-[18px] font-semibold">{firstName(c)}</span>
                <span className="font-display text-xl leading-6 font-semibold text-fg-secondary tabular-nums">{format(c.value)}</span>
              </div>
              <div
                className={cn(
                  "grid w-full place-items-start justify-center rounded-t-md pt-2 transition-[height] duration-300 ease-standard",
                  heights[i],
                  c.isMe || i === 1 ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg-secondary",
                )}
              >
                <span className="font-display text-[32px] leading-9 font-bold">{c.rank}</span>
              </div>
            </div>
          ) : (
            <div key={`vazio-${i}`} />
          ),
        )}
      </div>
    </section>
  );
}

/** Ranking completo; tocar numa pessoa escolhe o adversário do gráfico e do duelo. */
export function RankingList({
  ranking,
  rivalId,
  unit,
  format,
  onSelect,
}: {
  ranking: RankedCompetitor[];
  rivalId: string | null;
  unit: string;
  format: (value: number) => string;
  onSelect: (userId: string) => void;
}) {
  return (
    <section aria-label="Ranking" className="flex flex-col gap-2">
      <div className="mb-0.5 flex items-baseline justify-between px-1">
        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">Ranking</h2>
        <span className="text-[13px] text-fg-muted">
          {ranking.length - 1} {ranking.length - 1 === 1 ? "amizade" : "amizades"}
        </span>
      </div>
      {ranking.map((c) => {
        const selected = c.userId === rivalId;
        const move = movementOf(c);
        return (
          // A linha escolhe o adversário do duelo (botão por baixo de tudo) e a foto abre o perfil (link por
          // cima): link dentro de botão seria inválido e um anularia o outro.
          <div
            key={c.userId}
            className={cn(
              "relative flex min-h-16 items-center gap-2.5 rounded-lg py-2 pr-3.5 pl-2.5 text-fg transition-colors duration-150 has-[button:active]:scale-[0.98]",
              c.isMe ? "border-[1.5px] border-accent-text bg-accent/10" : selected ? "border-[1.5px] border-data bg-surface" : "border border-border bg-surface",
            )}
          >
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${c.rank}º, ${c.isMe ? "você" : (c.name ?? `@${c.handle}`)}, ${format(c.value)} ${unit}, ${move.text}${c.isMe ? "" : ". Duelar"}`}
              onClick={() => !c.isMe && onSelect(c.userId)}
              className="absolute inset-0 cursor-pointer rounded-lg outline-none focus-visible:shadow-focus"
            />
            <span aria-hidden="true" className="pointer-events-none flex w-[26px] flex-none flex-col items-center">
              <span className="font-display text-xl leading-[22px] font-bold tabular-nums">{c.rank}</span>
              <Icon icon={move.icon} size={13} label={move.text} className={move.iconClass} />
            </span>
            <CompetitorAvatar competitor={c} size="md" />
            <span aria-hidden="true" className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] leading-5 font-semibold">{c.isMe ? "Você" : (c.name ?? `@${c.handle}`)}</span>
              <span className="flex items-center gap-1 text-xs leading-4 text-fg-muted tabular-nums">
                <span>{c.totals.workouts === 1 ? "1 treino" : `${formatNumber(c.totals.workouts, 0)} treinos`}</span>
                <span>·</span>
                <StreakFlame size={13} />
                <span>{c.currentStreak} sem.</span>
              </span>
            </span>
            <span aria-hidden="true" className="pointer-events-none flex flex-col items-end">
              <span className={cn("font-display text-2xl leading-6 font-semibold tabular-nums", c.isMe ? "text-accent-text" : selected ? "text-data" : "text-fg")}>
                {format(c.value)}
              </span>
              <span className="text-[11px] leading-4 text-fg-muted">{unit}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
}

interface DuelRow {
  label: string;
  me: number;
  rival: number;
  format: (value: number) => string;
}

/** Adversário fixo do duelo (duelo aberto pelo perfil da pessoa). */
function RivalSide({ rival }: { rival: RankedCompetitor }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 py-2">
      <span className="grid rounded-pill border-2 border-data p-0.5">
        <CompetitorAvatar competitor={rival} size="lg" />
      </span>
      <span className="max-w-full truncate text-sm leading-5 font-semibold">{firstName(rival)}</span>
      <span className="text-xs leading-4 text-fg-muted">{rankLabel(rival.rank)} lugar</span>
    </div>
  );
}

/** Adversário que pode ser trocado por outra pessoa do ranking (tela geral da competição). */
function RivalPicker({ rival, candidates, onPick }: { rival: RankedCompetitor; candidates: RankedCompetitor[]; onPick: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Duelando com ${firstName(rival)}. Trocar adversário`}
        className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-1 pt-2 pb-2.5 text-fg hover:bg-surface-3 active:scale-[0.97]"
      >
        <span className="relative grid rounded-pill border-2 border-data p-0.5">
          <Avatar src={rival.avatarUrl} name={rival.name ?? rival.handle} size="lg" />
          <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-pill border border-border-strong bg-surface-elevated">
            <Icon icon={ArrowLeftRight} size={13} />
          </span>
        </span>
        <span className="max-w-full truncate text-sm leading-5 font-semibold">{firstName(rival)}</span>
        <span className="flex items-center gap-0.5 text-xs leading-4 font-semibold text-data">
          Trocar
          <Icon icon={ChevronDown} size={14} />
        </span>
      </button>

      <BottomSheet placement="screen" open={open} onClose={() => setOpen(false)} title="Duelar com">
        <div role="radiogroup" aria-label="Escolher adversário" className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
          {candidates.map((c) => {
            const on = c.userId === rival.userId;
            return (
              <button
                key={c.userId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  onPick(c.userId);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-16 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-fg active:scale-[0.98]",
                  on ? "border-[1.5px] border-data bg-surface-elevated" : "border border-border",
                )}
              >
                <span className="w-[22px] flex-none text-center font-display text-lg font-bold text-fg-muted tabular-nums">{c.rank}</span>
                <Avatar src={c.avatarUrl} name={c.name ?? c.handle} size="md" />
                <span className="min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold">{c.name ?? `@${c.handle}`}</span>
                <span className={cn("grid size-6 flex-none place-items-center rounded-pill", on ? "bg-data text-accent-foreground" : "border-[1.5px] border-border-strong")}>
                  {on && <Icon icon={Check} size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

/** Menor fatia de um lado da barra do duelo (quem tem 0 ainda aparece). */
const MIN_BAR_SHARE = 0.04;

export interface DuelPicker {
  candidates: RankedCompetitor[];
  onPick: (userId: string) => void;
}

/**
 * Duelo: você contra uma pessoa em cada métrica.
 * @param picker sem ele, o adversário é fixo (duelo aberto pelo perfil da pessoa)
 */
export function DuelCard({
  me,
  rival,
  formatVolume,
  picker,
}: {
  me: RankedCompetitor;
  rival: RankedCompetitor;
  formatVolume: (value: number) => string;
  picker?: DuelPicker;
}) {
  const count = (value: number) => formatNumber(value, 0);
  const pick = (totals: CompetitorTotals, key: "points" | "workouts" | "volume" | "records") => metricValue(totals, key);
  const rows: DuelRow[] = [
    { label: "Pontos", me: pick(me.totals, "points"), rival: pick(rival.totals, "points"), format: count },
    { label: "Treinos", me: pick(me.totals, "workouts"), rival: pick(rival.totals, "workouts"), format: count },
    { label: "Volume", me: pick(me.totals, "volume"), rival: pick(rival.totals, "volume"), format: formatVolume },
    { label: "Recordes", me: pick(me.totals, "records"), rival: pick(rival.totals, "records"), format: count },
    { label: "Sequência (sem.)", me: me.currentStreak, rival: rival.currentStreak, format: count },
  ];
  const wins = rows.filter((r) => r.me > r.rival).length;

  return (
    <section aria-label="Duelo" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">Duelo</h2>
        <span className="text-[13px] text-fg-muted">
          Você vence em {wins} de {rows.length}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex flex-col items-center gap-1.5 py-2">
          <span className="grid rounded-pill border-2 border-accent-text p-0.5">
            <Avatar src={me.avatarUrl} name={me.name ?? me.handle} size="lg" />
          </span>
          <span className="text-sm leading-5 font-semibold">Você</span>
          <span className="text-xs leading-4 text-fg-muted">{rankLabel(me.rank)} lugar</span>
        </div>
        <span className="font-display text-2xl font-bold text-fg-muted">VS</span>
        {picker ? <RivalPicker rival={rival} candidates={picker.candidates} onPick={picker.onPick} /> : <RivalSide rival={rival} />}
      </div>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => {
          const total = r.me + r.rival;
          // Os dois zerados: metades iguais em cor neutra (ninguém está na frente).
          const tied = total === 0;
          const meShare = tied ? 1 : Math.max(MIN_BAR_SHARE, r.me / total);
          const rivalShare = tied ? 1 : Math.max(MIN_BAR_SHARE, r.rival / total);
          return (
            <div key={r.label} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 tabular-nums">
                <span className={cn("font-display text-xl leading-6 font-semibold", !tied && r.me >= r.rival ? "text-accent-text" : "text-fg-secondary")}>{r.format(r.me)}</span>
                <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{r.label}</span>
                <span className={cn("text-right font-display text-xl leading-6 font-semibold", !tied && r.rival >= r.me ? "text-data" : "text-fg-secondary")}>{r.format(r.rival)}</span>
              </div>
              <div className="flex h-2 gap-[3px]">
                {/* Proporção de cada lado (dinâmico). */}
                <span
                  className={cn("basis-0 rounded-l-pill rounded-r-[2px] transition-[flex-grow] duration-300", tied ? "bg-surface-3" : "bg-accent")}
                  style={{ flexGrow: meShare }}
                />
                <span
                  className={cn("basis-0 rounded-l-[2px] rounded-r-pill transition-[flex-grow] duration-300", tied ? "bg-surface-3" : "bg-data")}
                  style={{ flexGrow: rivalShare }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
