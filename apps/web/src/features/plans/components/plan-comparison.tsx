import { formatFeatureAccess, PLAN_FEATURE_LABELS, PLAN_FEATURES, type CatalogPlan, type PlanFeature } from "@guf/core";
import { cn } from "@/shared/helpers/class-names";

export interface PlanComparisonProps {
  plans: CatalogPlan[];
  /** Plano atual da pessoa (coluna marcada). */
  currentPlanCode: string | null;
  /** Funcionalidade que trouxe a pessoa até aqui (linha em destaque). */
  highlight: PlanFeature | null;
}

/** Tabela "o que cada plano inclui", montada do catálogo do banco (muda sem deploy). */
export function PlanComparison({ plans, currentPlanCode, highlight }: PlanComparisonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Comparação dos planos</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-3.5 py-3 text-[13px] font-semibold text-fg-muted">
              Inclui
            </th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                scope="col"
                className={cn("px-3 py-3 text-center text-[15px] font-bold", plan.isPurchasable ? "text-accent-text" : "text-fg")}
              >
                {plan.name}
                {plan.code === currentPlanCode && <span className="block text-[11px] font-semibold text-fg-muted">Seu plano</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURES.map((feature) => (
            <tr key={feature} className={cn("border-b border-border last:border-b-0", feature === highlight && "bg-accent/10")}>
              <th scope="row" className="px-3.5 py-3 text-[14px] leading-5 font-medium text-fg-secondary">
                {PLAN_FEATURE_LABELS[feature]}
              </th>
              {plans.map((plan) => (
                <td key={plan.code} className="px-3 py-3 text-center text-[14px] leading-5 text-fg">
                  {formatFeatureAccess(feature, plan.features[feature])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
