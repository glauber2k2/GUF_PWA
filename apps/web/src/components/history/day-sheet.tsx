"use client";

import { Activity, ChevronRight, Trophy } from "lucide-react";
import {
  formatElapsed,
  formatNumber,
  formatShortDate,
  fromLocalISODate,
  plural,
  routineLetter,
  TIMES_SIGN,
  toDisplayWeight,
  type WeightUnit,
} from "@guf/core";
import type { DaySession } from "@guf/api";
import { Banner, BottomSheet, Icon, Skeleton } from "@/components/ds";
import { useDaySessions } from "@/hooks/use-history";

/** Volume sem casas (12.480 kg); carga com até 1 casa (82,5 kg). */
const volumeText = (kg: number, unit: WeightUnit) => `${formatNumber(toDisplayWeight(kg, unit) ?? 0, 0)} ${unit}`;
const loadText = (kg: number, unit: WeightUnit) => `${formatNumber(toDisplayWeight(kg, unit) ?? 0)} ${unit}`;

export interface DaySheetProps {
  /** Dia aberto ("yyyy-MM-dd"); null = folha fechada. */
  iso: string | null;
  unit: WeightUnit;
  onClose: () => void;
  onOpenSession: (session: DaySession) => void;
}

/** Treinos concluídos de um dia do calendário, com duração, volume, séries e recordes. */
export function DaySheet({ iso, unit, onClose, onOpenSession }: DaySheetProps) {
  const day = useDaySessions(iso);
  const sessions = day.data?.value ?? [];
  const volume = sessions.reduce((t, s) => t + s.volumeKg, 0);
  const subtitle = sessions.length ? [plural(sessions.length, "treino", "treinos"), volume ? volumeText(volume, unit) : null].filter(Boolean).join(" · ") : undefined;

  return (
    <BottomSheet placement="screen" open={iso !== null} onClose={onClose} title={iso ? formatShortDate(fromLocalISODate(iso)) : undefined} subtitle={subtitle}>
      {day.isPending ? (
        <div aria-busy="true" aria-label="Carregando treinos do dia" className="flex flex-col gap-2.5">
          <Skeleton className="h-[72px] rounded-[14px]" />
          <Skeleton className="h-[72px] rounded-[14px]" />
        </div>
      ) : day.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void day.refetch()}>
          {day.error?.message ?? "Não foi possível carregar os treinos do dia. Verifique a internet e tente de novo."}
        </Banner>
      ) : (
        sessions.map((s, i) => <DaySessionItem key={s.id} session={s} index={i} unit={unit} onOpen={() => onOpenSession(s)} />)
      )}
    </BottomSheet>
  );
}

function DaySessionItem({
  session,
  index,
  unit,
  onOpen,
}: {
  session: DaySession;
  index: number;
  unit: WeightUnit;
  onOpen: () => void;
}) {
  const meta = [formatElapsed(session.durationSeconds), session.volumeKg ? volumeText(session.volumeKg, unit) : null, plural(session.setCount, "série", "séries")]
    .filter(Boolean)
    .join(" · ");
  const records = session.records;
  const recordsTitle = records.length > 1 ? `${records.length} recordes pessoais` : "Recorde pessoal";
  const label = [session.name, `${Math.floor(session.durationSeconds / 60)} minutos`, plural(session.setCount, "série", "séries"), records.length ? plural(records.length, "recorde", "recordes") : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      style={{ animationDelay: `${index * 40}ms` }}
      className={[
        "flex w-full animate-guf-rise-fast cursor-pointer flex-col gap-2.5 rounded-[14px] border border-border bg-surface-elevated p-3.5 text-left text-fg",
        "transition-[transform,background-color] duration-150 ease-standard hover:bg-surface-3 active:scale-[.98] motion-reduce:active:scale-100",
      ].join(" ")}
    >
      <span className="flex w-full items-center gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 font-display text-xl font-bold text-fg-secondary">
          {session.routineId ? routineLetter(session.name) : <Icon icon={Activity} size={20} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-5 font-semibold">{session.name}</span>
          <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{meta}</span>
        </span>
        <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
      </span>
      {records.length > 0 && (
        <span className="flex flex-col gap-1.5 rounded-[10px] bg-pr/12 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] leading-4 font-semibold tracking-[0.08em] text-pr-text uppercase">
            <Icon icon={Trophy} size={14} />
            {recordsTitle}
          </span>
          {records.map((r) => (
            <span key={r.exerciseName} className="text-[13px] leading-[18px] font-medium tabular-nums">
              {r.exerciseName} · {loadText(r.weightKg, unit)}
              {r.reps ? ` ${TIMES_SIGN} ${r.reps}` : ""}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
