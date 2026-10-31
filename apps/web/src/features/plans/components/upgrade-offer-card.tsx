import { Check, Crown } from "lucide-react";
import { formatFeatureAccess, formatIntervalSuffix, formatMoney, PLAN_FEATURE_LABELS, type CatalogPlan, type PlanFeature, type PlanPrice } from "@guf/core";
import { Icon } from "@/shared/components/ds";

/** Quantos destaques cabem no cartão (a lista completa fica na comparação logo abaixo). */
const TOP_HIGHLIGHTS = 3;

export interface UpgradeOfferCardProps {
  plan: CatalogPlan;
  price: PlanPrice | null;
  highlights: readonly PlanFeature[];
}

/** Oferta do plano acima: nome, preço à venda e o que ele libera a mais. */
export function UpgradeOfferCard({ plan, price, highlights }: UpgradeOfferCardProps) {
  return (
    <section
      aria-label={plan.name}
      className="flex animate-guf-rise flex-col gap-4 rounded-lg border-[1.5px] border-accent-text bg-accent/10 px-4 pt-5 pb-4 [animation-delay:120ms]"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 flex-none place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon icon={Crown} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-lg leading-6">{plan.name}</strong>
          <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">Tire os limites e use tudo que o guf tem para a sua evolução.</span>
        </span>
      </div>
      {price ? (
        <p className="m-0 flex flex-wrap items-baseline gap-2.5">
          <span className="font-display text-[40px] leading-10 font-bold text-accent-text tabular-nums">{formatMoney(price.amountCents, price.currency)}</span>
          <span className="text-sm font-semibold text-fg-secondary">{formatIntervalSuffix(price.interval)}</span>
        </p>
      ) : (
        <p className="m-0 text-sm leading-5 text-fg-secondary">A assinatura ainda não está disponível. Avisaremos quando o {plan.name} puder ser assinado.</p>
      )}
      {highlights.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {highlights.slice(0, TOP_HIGHLIGHTS).map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm leading-5">
              <span className="grid size-[22px] flex-none place-items-center rounded-full bg-accent text-accent-foreground">
                <Icon icon={Check} size={13} />
              </span>
              <span>
                {PLAN_FEATURE_LABELS[feature]}: <strong className="font-semibold">{formatFeatureAccess(feature, plan.features[feature]).toLowerCase()}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
