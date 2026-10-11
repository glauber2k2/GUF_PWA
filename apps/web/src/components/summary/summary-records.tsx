"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Trophy } from "lucide-react";
import { formatNumber, recordsTitle, TIMES_SIGN, toDisplayWeight, type WeightUnit } from "@guf/core";
import type { WorkoutSummaryRecord } from "@guf/api";
import { Icon } from "@/components/ds";
import { exercisePath } from "@/components/evolution/paths";

/** Bloco dourado com os recordes do treino; cada um abre a evolução do exercício. */
export function SummaryRecords({ records, unit }: { records: WorkoutSummaryRecord[]; unit: WeightUnit }) {
  const router = useRouter();
  return (
    <section
      aria-label="Recordes do treino"
      className="flex flex-none animate-guf-rise items-start gap-3 rounded-lg border border-pr/50 bg-pr-highlight px-4 py-3.5 shadow-pr-glow [animation-delay:80ms]"
    >
      <span className="mt-0.5 grid size-10 flex-none place-items-center rounded-pill bg-pr text-pr-foreground">
        <Icon icon={Trophy} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs leading-4 font-semibold text-pr-text">{recordsTitle(records.length)}</span>
        {records.map((r) => {
          const load = `${formatNumber(toDisplayWeight(r.weightKg, unit) ?? 0)} ${unit}`;
          return (
            <button
              key={r.exerciseId}
              type="button"
              onClick={() => router.push(exercisePath(r.exerciseId))}
              aria-label={`Recorde pessoal: ${r.exerciseName}, ${load}${r.reps ? ` por ${r.reps} repetições` : ""}. Ver evolução`}
              className="-mx-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-transparent px-2 text-left text-fg transition-colors duration-150 ease-standard hover:bg-pr/14 active:scale-[.98] motion-reduce:active:scale-100"
            >
              <span className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{r.exerciseName}</span>
              <span className="font-display text-[22px] leading-6 font-bold whitespace-nowrap tabular-nums">
                {load}
                {r.reps ? ` ${TIMES_SIGN} ${r.reps}` : ""}
              </span>
              <Icon icon={ChevronRight} size={16} className="text-fg-muted" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
