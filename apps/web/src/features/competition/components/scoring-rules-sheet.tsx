"use client";

import { scoringRules } from "@guf/core";
import { BottomSheet, Skeleton } from "@/shared/components/ds";
import { useCompetitionParameters } from "@/features/competition/api/use-competition";

interface ScoringRulesSheetProps {
  open: boolean;
  onClose: () => void;
  /** Temporada (1º dia do mês, "yyyy-MM-dd") cujas regras valem. */
  season: string;
}

/** "Como funciona a pontuação": as regras montadas dos parâmetros do servidor (competição e extrato). */
export function ScoringRulesSheet({ open, onClose, season }: ScoringRulesSheetProps) {
  const params = useCompetitionParameters(season);
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Como funciona a pontuação">
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
  );
}
