"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Crown } from "lucide-react";
import { formatDayMonthYear } from "@guf/core";
import { Icon, Skeleton } from "@/shared/components/ds";
import { usePlanGate } from "@/features/plans/hooks/use-plan-gate";
import { plansPath } from "@/features/plans/helpers/paths";

/** Seção "Plano" das Configurações: plano atual e atalho para a tela de planos. */
export function PlanSettingsSection() {
  const router = useRouter();
  const { entitlements } = usePlanGate();

  const subtitle = !entitlements
    ? null
    : entitlements.isDefaultPlan
      ? "Veja o que o Pro inclui"
      : entitlements.validUntil
        ? `Válido até ${formatDayMonthYear(new Date(entitlements.validUntil))}`
        : "Ver o que seu plano inclui";

  return (
    <section aria-labelledby="pf-plan" className="flex animate-guf-rise flex-col gap-2 [animation-delay:50ms]">
      <h2 id="pf-plan" className="mt-2 ml-1 scroll-mt-[calc(64px+env(safe-area-inset-top))] text-lg leading-6 font-semibold tracking-[-0.015em]">
        Plano
      </h2>
      <div className="rounded-lg border border-border bg-surface px-2 py-1.5 shadow-e1">
        {entitlements ? (
          <button
            type="button"
            onClick={() => router.push(plansPath())}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md bg-transparent p-2 text-left text-fg transition-colors duration-150 ease-standard hover:bg-surface-3"
          >
            <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-accent/16 text-accent-text">
              <Icon icon={Crown} size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] leading-5 font-semibold">Plano {entitlements.planName}</span>
              <span className="text-[13px] leading-[18px] text-fg-secondary">{subtitle}</span>
            </span>
            <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
          </button>
        ) : (
          <Skeleton className="m-2 h-10 rounded-md" />
        )}
      </div>
    </section>
  );
}
