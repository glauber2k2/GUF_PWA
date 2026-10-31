import { Check, Lock } from "lucide-react";
import { formatFeatureAccess, PLAN_FEATURE_LABELS, PLAN_FEATURES, type CatalogPlan } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { PLAN_FEATURE_ICONS } from "@/features/plans/constants/feature-icons";

/** "Incluído no seu plano": cada funcionalidade do catálogo com o que o plano dá nela. */
export function IncludedFeaturesList({ plan }: { plan: CatalogPlan }) {
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-border bg-surface p-0">
      {PLAN_FEATURES.map((feature) => {
        const access = plan.features[feature];
        return (
          <li key={feature} className="flex min-h-14 items-center gap-3.5 border-b border-border px-4 py-2.5 last:border-b-0">
            <span
              className={cn(
                "grid size-9 flex-none place-items-center rounded-md",
                access.enabled ? "bg-accent/14 text-accent-text" : "bg-surface-3 text-fg-muted",
              )}
            >
              <Icon icon={PLAN_FEATURE_ICONS[feature]} size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <strong className="text-[15px] leading-5 font-semibold">{PLAN_FEATURE_LABELS[feature]}</strong>
              <span className="text-xs leading-4 text-fg-secondary">{formatFeatureAccess(feature, access)}</span>
            </span>
            <Icon icon={access.enabled ? Check : Lock} size={18} className={access.enabled ? "text-accent-text" : "text-fg-muted"} />
          </li>
        );
      })}
    </ul>
  );
}
