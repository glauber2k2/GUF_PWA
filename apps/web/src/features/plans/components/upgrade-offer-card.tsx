import { Check, Crown } from "lucide-react";
import type { ReactNode } from "react";
import { formatFeatureAccess, PLAN_FEATURE_LABELS, type CatalogPlan, type PlanFeature, type PlanPrice } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { PriceTag } from "@/features/plans/components/price-tag";

/** Quantos destaques cabem no cartão (a lista completa fica na comparação logo abaixo). */
const TOP_HIGHLIGHTS = 3;

export interface UpgradeOfferCardProps {
  plan: CatalogPlan;
  price: PlanPrice | null;
  highlights: readonly PlanFeature[];
  /** Seletor mensal/anual (acima do preço; a oferta guarda a escolha). */
  picker?: ReactNode;
}

/** Oferta do plano acima: nome, periodicidade, preço à venda (por mês, com a promoção) e o que ele libera a mais. */
export function UpgradeOfferCard({ plan, price, highlights, picker }: UpgradeOfferCardProps) {
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
      {picker}
      {price ? (
        <PriceTag price={price} />
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
