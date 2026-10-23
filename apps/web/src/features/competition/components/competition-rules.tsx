"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { scoringSummary } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { useCompetitionParameters } from "@/features/competition/api/use-competition";
import { ScoringRulesSheet } from "@/features/competition/components/scoring-rules-sheet";

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
      <ScoringRulesSheet open={open} onClose={() => setOpen(false)} season={season} />
    </>
  );
}
