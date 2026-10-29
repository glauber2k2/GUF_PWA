"use client";

import { CircleCheck, NotepadText, Pencil } from "lucide-react";
import { feedFooterLabel, feedMuscleLevels, feedOwnerLine, toDisplayWeight, type WeightUnit } from "@guf/core";
import type { WorkoutFeedItem } from "@guf/api";
import { Avatar, Icon, MuscleFigure } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { feedEntrance } from "./feed-entrance";
import { FeedExerciseList } from "./feed-exercise-list";
import { FeedStats } from "./feed-stats";

/** Altura de cada vista do boneco no quadro de 124 px. */
const FIGURE_HEIGHT_PX = 108;

export interface WorkoutFeedOwner {
  name: string;
  avatarUrl: string | null;
}

export interface WorkoutFeedCardProps {
  workout: WorkoutFeedItem;
  owner: WorkoutFeedOwner;
  unit: WeightUnit;
  /** Entrada animada (só o primeiro card ao abrir a lista; os outros aparecem parados). */
  isAnimated: boolean;
  onOpen: () => void;
}

/**
 * Card do treino no feed do perfil (Claude Design "Cards Feed de Treino" · 2a, formato 4:5): quem e
 * quando, boneco com os músculos e os primeiros exercícios, volume, PRs, pontos (some para visitante),
 * observação (só no seu) e o rodapé de edição. Tocar abre o resumo do treino.
 */
export function WorkoutFeedCard({ workout, owner, unit, isAnimated, onOpen }: WorkoutFeedCardProps) {
  const title = workout.name ?? "Treino livre";
  const header = feedEntrance(isAnimated, "header");
  const body = feedEntrance(isAnimated, "body");
  const stats = feedEntrance(isAnimated, "stats");
  const note = feedEntrance(isAnimated, "note");
  const footer = feedEntrance(isAnimated, "footer");
  const levels = feedMuscleLevels(workout.exercises);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${title}. Abrir o resumo do treino`}
      className={cn(
        "flex aspect-[4/5] w-full cursor-pointer flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-surface p-3.5 text-left text-fg shadow-e1 transition-transform duration-150 ease-standard active:scale-99",
        isAnimated && "animate-guf-rise",
      )}
    >
      <div className={cn("flex flex-none items-center gap-2.5", header.className)} style={header.style}>
        <Avatar src={owner.avatarUrl} name={owner.name} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-[15px] leading-5 tracking-[-0.01em]">{title}</strong>
          <span className="truncate text-xs leading-4 text-fg-muted">{feedOwnerLine(owner.name, workout.performedOn, workout.durationSeconds)}</span>
        </div>
      </div>

      <div className={cn("grid grid-cols-[124px_minmax(0,1fr)] gap-3", body.className)} style={body.style}>
        <div className="flex items-center justify-center -space-x-2 rounded-[12px] border border-border bg-surface-elevated py-2" aria-hidden="true">
          <MuscleFigure view="front" height={FIGURE_HEIGHT_PX} levels={levels} />
          <MuscleFigure view="back" height={FIGURE_HEIGHT_PX} levels={levels} />
        </div>
        <FeedExerciseList exercises={workout.exercises} unit={unit} />
      </div>

      <div className={stats.className} style={stats.style}>
        <FeedStats volume={toDisplayWeight(workout.volumeKg, unit) ?? 0} unit={unit} records={workout.records} points={workout.points} isAnimated={isAnimated} />
      </div>

      {workout.note && (
        <div className={cn("flex gap-2 rounded-[10px] bg-surface-3 px-2.5 py-2", note.className)} style={note.style}>
          <Icon icon={NotepadText} size={14} className="mt-0.5 flex-none text-fg-muted" />
          <span className="line-clamp-2 min-w-0 flex-1 text-xs leading-[17px] text-fg-secondary">{workout.note}</span>
        </div>
      )}

      <div className={cn("mt-auto flex items-center gap-1.5 border-t border-border pt-2 text-[11px] leading-[14px] text-fg-muted", footer.className)} style={footer.style}>
        <Icon icon={workout.editedAt ? Pencil : CircleCheck} size={12} />
        <span>{feedFooterLabel(workout)}</span>
      </div>
    </button>
  );
}
