"use client";

import { useState } from "react";
import { Info, Users } from "lucide-react";
import { formatNumber, formatShortDate, fromLocalISODate, rpeAdjustmentText, scoringRules, type CompetitionRange } from "@guf/core";
import { BottomSheet, Icon, Skeleton } from "@/shared/components/ds";
import { useCompetitionParameters, useMyCompetitionSessions } from "@/features/competition/api/use-competition";

/** Rodapé com a regra resumida e a folha "Como funciona" (regras públicas + seus ajustes de esforço). */
export function CompetitionRules({ range, season }: { range: CompetitionRange; season: string }) {
  const [open, setOpen] = useState(false);
  const params = useCompetitionParameters(season);
  const sessions = useMyCompetitionSessions(range, open);
  const adjusted = (sessions.data ?? []).filter((s) => s.rpeAdjustment && s.rpeInformed !== null && s.rpeUsed !== null);

  return (
    <>
      <div className="flex items-start gap-2.5 border-t border-border px-1 pt-3">
        <Icon icon={Users} size={18} className="mt-px text-fg-muted" />
        <span className="text-xs leading-4 text-pretty text-fg-muted">
          Só entram pessoas que vocês se seguem mutuamente. Pontos da semana = constância (até 60) + esforço (até 40) + sequência (até 20).{" "}
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

          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-[15px] font-semibold">Seus treinos ajustados no período</h3>
            {sessions.isPending ? (
              <Skeleton className="h-16 w-full rounded-md" />
            ) : adjusted.length === 0 ? (
              <p className="m-0 text-[13px] text-fg-muted">Nenhum ajuste: seus treinos contaram com o esforço que você informou.</p>
            ) : (
              params.data &&
              adjusted.map((s) => (
                <div key={s.sessionId} className="flex flex-col gap-1 rounded-md bg-surface-3 px-3.5 py-3">
                  <strong className="text-sm">
                    {s.name ?? "Treino livre"} · {formatShortDate(fromLocalISODate(s.trainingDay))}
                  </strong>
                  <span className="text-[13px] leading-[18px] text-fg-secondary">{rpeAdjustmentText(s.rpeAdjustment!, s.rpeInformed!, s.rpeUsed!, params.data)}</span>
                  <span className="text-xs text-fg-muted">Carga considerada: {formatNumber(s.load, 0)}</span>
                </div>
              ))
            )}
          </section>

          <div className="flex items-start gap-2.5 rounded-md bg-surface-3 px-3.5 py-3 text-[13px] leading-[18px] text-fg-secondary">
            <Icon icon={Info} size={16} className="mt-px flex-none text-info" />
            <span>Discorda de um ajuste? Peça revisão em Configurações › Privacidade › Outros pedidos sobre seus dados.</span>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
