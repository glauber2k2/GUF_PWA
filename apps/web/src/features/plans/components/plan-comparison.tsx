import type { CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import { formatFeatureAccess, PLAN_FEATURE_LABELS, PLAN_FEATURES, type CatalogPlan, type FeatureAccess, type PlanFeature } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { PLAN_FEATURE_ICONS } from "@/features/plans/constants/feature-icons";

const PLAN_COLUMN_PX = 76;

export interface PlanComparisonProps {
  plans: CatalogPlan[];
  /** Funcionalidade que trouxe a pessoa até aqui (linha em destaque). */
  highlight?: PlanFeature | null;
  /** Funcionalidades mostradas (padrão: todas do catálogo). */
  features?: readonly PlanFeature[];
  className?: string;
}

/** Planos lado a lado, montados do catálogo do banco (muda sem deploy). */
export function PlanComparison({ plans, highlight = null, features = PLAN_FEATURES, className }: PlanComparisonProps) {
  // O número de colunas vem do catálogo: valor dinâmico, por isso o estilo inline.
  const columns: CSSProperties = { gridTemplateColumns: `minmax(0,1fr) repeat(${plans.length}, ${PLAN_COLUMN_PX}px)` };
  return (
    <div role="table" aria-label="Comparação dos planos" className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div role="row" style={columns} className="grid items-center border-b border-border px-4 py-2.5">
        <span role="columnheader" className="sr-only">
          Funcionalidade
        </span>
        {plans.map((plan) => (
          <span key={plan.code} role="columnheader" className="flex justify-center">
            <span
              className={cn(
                "grid h-[22px] place-items-center rounded-full px-2 text-xs",
                plan.isPurchasable ? "bg-accent font-bold text-accent-foreground" : "font-semibold text-fg-muted",
              )}
            >
              {plan.name}
            </span>
          </span>
        ))}
      </div>
      {features.map((feature) => (
        <div
          key={feature}
          role="row"
          style={columns}
          className={cn("grid min-h-[52px] items-center border-b border-border px-4 py-1.5 last:border-b-0", feature === highlight && "bg-accent/10")}
        >
          <span role="rowheader" className="flex min-w-0 items-center gap-2.5">
            <Icon icon={PLAN_FEATURE_ICONS[feature]} size={18} className="flex-none text-fg-secondary" />
            <span className="text-sm leading-[18px]">{PLAN_FEATURE_LABELS[feature]}</span>
          </span>
          {plans.map((plan) => (
            <span key={plan.code} role="cell" className="flex justify-center">
              <FeatureAccessCell feature={feature} access={plan.features[feature]} isHighlighted={plan.isPurchasable} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Não incluído = cadeado; incluído sem número = visto; limite = o texto ("Até 5", "Sem limite"). */
function FeatureAccessCell({ feature, access, isHighlighted }: { feature: PlanFeature; access: FeatureAccess; isHighlighted: boolean }) {
  const text = formatFeatureAccess(feature, access);
  const tone = isHighlighted ? "font-bold text-accent-text" : "text-fg-muted";
  if (!access.enabled) return <Icon icon={Lock} size={16} label={text} className="text-fg-muted" />;
  if (access.kind === "flag") return <Icon icon={Check} size={18} label={text} className={isHighlighted ? "text-accent-text" : "text-fg-muted"} />;
  return <span className={cn("text-center text-xs leading-4", tone)}>{text}</span>;
}
