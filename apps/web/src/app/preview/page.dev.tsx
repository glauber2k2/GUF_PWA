"use client";

// TEMPORÁRIO (só dev): harness do "segurar para reordenar" do treino, para teste automatizado. Apagar antes do commit.
import { useRef, useState } from "react";
import { AnimatePresence, LAYOUT_ITEM_PROPS, LayoutItem } from "@/components/ds";
import { REORDER_CARD_PX, WORKOUT_LIST_GAP_PX, WorkoutExerciseCard } from "@/components/workout/workout-exercise-card";
import type { ExerciseView } from "@/components/workout/workout-state";
import { useHoldReorder } from "@/hooks/use-hold-reorder";

const NAMES = ["Supino reto", "Supino inclinado", "Crucifixo", "Paralelas", "Tríceps polia", "Tríceps francês"];
const make = (): ExerciseView[] =>
  NAMES.map((name, i) => ({
    id: `e${i}`,
    exerciseId: `x${i}`,
    name,
    muscleGroup: i < 3 ? "peito" : "triceps",
    equipment: "barra",
    restSeconds: 90,
    note: null,
    bestKg: null,
    open: i < 2,
    flash: false,
    sets: [0, 1, 2].map((k) => ({ id: `${i}-${k}`, setNumber: k + 1, setType: "normal", weightKg: 40, reps: 10, isCompleted: k === 0, previous: null })),
  }));

export default function PreviewPage() {
  const [items, setItems] = useState(make);
  const [saves, setSaves] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const reorder = useHoldReorder({
    items,
    itemPx: REORDER_CARD_PX,
    gapPx: WORKOUT_LIST_GAP_PX,
    listRef,
    onCommit: (next) => {
      setItems(next);
      setSaves((n) => n + 1);
    },
  });
  const noop = () => {};
  return (
    <main className="relative flex min-h-dvh flex-col gap-3 bg-background px-4 pt-4 pb-40">
      <p id="order" className="text-xs text-fg-muted">
        {items.map((e) => e.name).join(" | ")} · modo={String(reorder.active)} · gravações={saves}
      </p>
      <div ref={listRef} className="relative flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {(reorder.active ? reorder.order : items).map((ex, i, list) => (
            <LayoutItem key={ex.id} {...LAYOUT_ITEM_PROPS} layout={reorder.draggingId === ex.id ? false : "position"} className="flex flex-none flex-col">
              <WorkoutExerciseCard
                exercise={ex}
                unit="kg"
                enterDelayMs={0}
                poppedKey={null}
                editing={null}
                holdProps={reorder.holdProps(ex.id)}
                reorder={reorder.active ? { index: i, total: list.length, dragging: reorder.draggingId === ex.id, dragOffset: reorder.dragOffset } : undefined}
                onToggleOpen={() => setItems((all) => all.map((x) => (x.id === ex.id ? { ...x, open: !x.open } : x)))}
                onOpenMenu={noop}
                onOpenNote={noop}
                onAddSet={noop}
                onToggleSet={noop}
                onCycleType={noop}
                onEditField={noop}
                onRemoveSet={noop}
              />
            </LayoutItem>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
