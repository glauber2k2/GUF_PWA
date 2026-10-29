"use client";

import { CircleCheck, NotepadText, Pencil } from "lucide-react";
import { feedFooterLabel, feedMuscleLevels, feedNoteText, feedOwnerLine, toDisplayWeight, type WeightUnit } from "@guf/core";
import type { WorkoutFeedItem } from "@guf/api";
import { Avatar, Icon, MuscleFigure } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { prefersReducedMotion } from "@/shared/helpers/motion";
import { useInViewOnce } from "@/shared/hooks/use-in-view-once";
import { feedCardEntranceClass, feedEntrance, feedEntranceState } from "./feed-entrance";
import { FeedExerciseList } from "./feed-exercise-list";
import { FEED_SIZES } from "./feed-layout";
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
  /** Pode animar a entrada (só o primeiro card): anima quando a pessoa rola até ele; os outros aparecem parados. */
  canAnimate: boolean;
  onOpen: () => void;
}

/**
 * Card do treino no feed do perfil (Claude Design "Cards Feed de Treino" · 2a, altura fixa): quem e
 * quando, boneco com os músculos e os primeiros exercícios, volume, PRs, pontos (some para visitante),
 * observação do treino ou dos exercícios (sempre com o quadro; vazio = texto de apoio) e o rodapé de
 * edição. Tocar abre o resumo.
 */
export function WorkoutFeedCard({ workout, owner, unit, canAnimate, onOpen }: WorkoutFeedCardProps) {
  // Movimento reduzido: aparece parado como os outros (a regra global encurta a animação, mas não os atrasos).
  const shouldAnimate = canAnimate && !prefersReducedMotion();
  const { ref, hasEntered } = useInViewOnce<HTMLButtonElement>(shouldAnimate);
  const entrance = feedEntranceState(shouldAnimate, hasEntered);
  const title = workout.name ?? "Treino livre";
  const header = feedEntrance(entrance, "header");
  const body = feedEntrance(entrance, "body");
  const stats = feedEntrance(entrance, "stats");
  const note = feedEntrance(entrance, "note");
  const footer = feedEntrance(entrance, "footer");
  const noteText = feedNoteText(workout.note, workout.exercises);
  const levels = feedMuscleLevels(workout.exercises);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={`${title}. Abrir o resumo do treino`}
      className={cn(
        "flex w-full flex-none cursor-pointer flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-surface p-3.5 text-left text-fg shadow-e1 transition-transform duration-150 ease-standard active:scale-99",
        FEED_SIZES.card,
        feedCardEntranceClass(entrance),
      )}
    >
      <div className={cn("flex flex-none items-center gap-2.5", FEED_SIZES.header, header.className)} style={header.style}>
        <Avatar src={owner.avatarUrl} name={owner.name} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-[15px] leading-5 tracking-[-0.01em]">{title}</strong>
          <span className="truncate text-xs leading-4 text-fg-muted">{feedOwnerLine(owner.name, workout.performedOn, workout.durationSeconds)}</span>
        </div>
      </div>

      <div className={cn("grid flex-none grid-cols-[124px_minmax(0,1fr)] gap-3 overflow-hidden", FEED_SIZES.body, body.className)} style={body.style}>
        <div className="flex h-full items-center justify-center -space-x-2 rounded-[12px] border border-border bg-surface-elevated" aria-hidden="true">
          <MuscleFigure view="front" height={FIGURE_HEIGHT_PX} levels={levels} />
          <MuscleFigure view="back" height={FIGURE_HEIGHT_PX} levels={levels} />
        </div>
        <FeedExerciseList exercises={workout.exercises} unit={unit} />
      </div>

      <div className={cn("flex-none", FEED_SIZES.stats, stats.className)} style={stats.style}>
        <FeedStats volume={toDisplayWeight(workout.volumeKg, unit) ?? 0} unit={unit} records={workout.records} points={workout.points} isAnimated={entrance === "playing"} />
      </div>

      <div className={cn("flex flex-none gap-2 overflow-hidden rounded-[10px] bg-surface-3 px-2.5 py-2", FEED_SIZES.note, note.className)} style={note.style}>
        <Icon icon={NotepadText} size={14} className="mt-0.5 flex-none text-fg-muted" />
        <span className={cn("line-clamp-2 min-w-0 flex-1 text-xs leading-[17px]", noteText.isPlaceholder ? "text-fg-muted italic" : "text-fg-secondary")}>
          {noteText.text}
        </span>
      </div>

      <div className={cn("mt-auto flex flex-none items-center gap-1.5 border-t border-border pt-2 text-[11px] leading-[14px] text-fg-muted", FEED_SIZES.footer, footer.className)} style={footer.style}>
        <Icon icon={workout.editedAt ? Pencil : CircleCheck} size={12} />
        <span className="truncate">{feedFooterLabel(workout)}</span>
      </div>
    </button>
  );
}
