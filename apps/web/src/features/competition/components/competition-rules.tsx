"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { scoringRules, scoringSummary } from "@guf/core";
import { BottomSheet, Icon, Skeleton } from "@/shared/components/ds";
import { useCompetitionParameters } from "@/features/competition/api/use-competition";

/** Rodapé com a regra resumida e a folha "Como funciona" (regras públicas da pontuação). */
export function CompetitionRules({ season }: { season: string }) {
  const [open, setOpen] = useState(false);
  const params = useCompetitionParameters(season);

  return (
    <>
      <div className="flex items-start gap-2.5 border-t border-border px-1 pt-3">
        <Icon icon={Users} size={18} className="mt-px text-fg-muted" />
        <span className="text-xs leading-4 text-pretty text-fg-muted">
          Só entram pessoas que vocês se seguem mutuamente. {scoringSummary(params.data)}{" "}
          <button type="button" onClick={() => setOpen(true)} className="cursor-pointer font-semibold text-accent-text">
            Como funciona
          </button>
        </span>
      </div>

      <BottomSheet placement="screen" open={open} onClose={() => setOpen(false)} title="Como funciona a pontuação">
        <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto">
          {params.data ? (
            <ul className="m-0 flex flex-col gap-2.5 pl-5 text-sm leading-5 text-fg-secondary">
              {scoringRules(params.data).map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-40 w-full rounded-md" />
          )}
        </div>
      </BottomSheet>
    </>
  );
}
