"use client";

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import type { PlanImportDraft } from "@guf/api";
import { planImportCounts, planImportSummary } from "@guf/core";
import { Button, Icon } from "@/shared/components/ds";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { handOffPlanImport } from "@/store/global/plan-import.store";
import { PLAN_IMPORT_PATH } from "@/features/projects";

/** Cartão da resposta do GUF AI com a ficha convertida: leva à revisão (nada é criado sem ela). */
export function PlanImportCard({ draft }: { draft: PlanImportDraft }) {
  const router = useRouter();
  const review = () => {
    handOffPlanImport(draft);
    router.push(withDevState(PLAN_IMPORT_PATH));
  };

  return (
    <div className="flex animate-guf-rise-fast flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-e1">
      <div className="flex items-start gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-md bg-accent/16 text-accent-text">
          <Icon icon={ClipboardList} size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs leading-4 font-semibold tracking-[0.06em] text-accent-text uppercase">Ficha convertida</span>
          <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere] text-fg">{draft.projectName}</span>
          <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{planImportSummary(planImportCounts(draft.routines))}</span>
        </div>
      </div>
      <Button variant="primary" fullWidth onClick={review}>
        Revisar e criar
      </Button>
    </div>
  );
}
