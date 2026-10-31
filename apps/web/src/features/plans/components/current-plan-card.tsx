import { Crown, User } from "lucide-react";
import { formatFeatureAccess, PLAN_FEATURE_LABELS, type CatalogPlan, type PlanFeature, type SubscriptionView } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

const OVERLINE = "text-[11px] leading-4 font-semibold tracking-[0.08em] uppercase";

/** Limites mostrados no cartão do plano gratuito (a lista completa fica na comparação). */
const TOP_LIMITS = 3;

export interface FreePlanCardProps {
  plan: CatalogPlan;
  /** Funcionalidades que o plano acima libera (mostra o limite que a pessoa tem hoje em cada uma). */
  limitedFeatures: readonly PlanFeature[];
}

/** Plano atual no plano gratuito: nome, selo "Gratuito" e os limites de hoje. */
export function FreePlanCard({ plan, limitedFeatures }: FreePlanCardProps) {
  return (
    <section aria-label="Plano atual" className="flex animate-guf-rise flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={User} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn(OVERLINE, "text-fg-muted")}>Plano atual</span>
          <strong className="text-lg leading-6">{plan.name}</strong>
        </span>
        <span className="flex h-[26px] items-center rounded-sm bg-surface-3 px-2.5 text-xs font-semibold text-fg-secondary">Gratuito</span>
      </div>
      {limitedFeatures.length > 0 && (
        <dl className="m-0 flex flex-col gap-3 border-t border-border pt-3.5">
          {limitedFeatures.slice(0, TOP_LIMITS).map((feature) => (
            <div key={feature} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm leading-[18px]">{PLAN_FEATURE_LABELS[feature]}</dt>
              <dd className="m-0 flex-none text-[13px] font-semibold text-fg-secondary">{formatFeatureAccess(feature, plan.features[feature])}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export interface PlanFact {
  label: string;
  value: string;
}

export interface PaidPlanCardProps {
  planName: string;
  view: SubscriptionView;
  /** Valor da assinatura ("R$ 14,80" + "/mês"); null = plano sem cobrança (ex.: cortesia). */
  price: { amount: string; suffix: string } | null;
  /** Próxima cobrança, fim do Pro ou validade do direito. */
  date: PlanFact | null;
  badge: string;
  /** Prazo de desistência, pagamento pendente ou devolução em andamento. */
  notice: { text: string; tone: "accent" | "warning" } | null;
}

const BADGE_TONES: Record<SubscriptionView, string> = {
  none: "bg-success/16 text-success",
  withdrawable: "bg-success/16 text-success",
  active: "bg-success/16 text-success",
  canceling: "bg-warning/16 text-warning",
  past_due: "bg-warning/16 text-warning",
  refunding: "bg-warning/16 text-warning",
  ended: "bg-surface-3 text-fg-secondary",
};

/** Plano atual pago: nome, situação, valor, data e o aviso que vale agora. */
export function PaidPlanCard({ planName, view, price, date, badge, notice }: PaidPlanCardProps) {
  const facts = [price, date].filter(Boolean);
  return (
    <section aria-label="Plano atual" className="flex animate-guf-rise flex-col gap-4 rounded-lg border-[1.5px] border-accent-text bg-accent/10 p-4">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 flex-none place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon icon={Crown} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn(OVERLINE, "text-accent-text")}>Plano atual</span>
          <strong className="text-lg leading-6">{planName}</strong>
        </span>
        <span className={cn("flex h-[26px] flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-bold", BADGE_TONES[view])}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {badge}
        </span>
      </div>
      {facts.length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-2.5 border-t border-border pt-3.5">
          {price && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-fg-muted">Valor</dt>
              <dd className="m-0 font-display text-2xl leading-7 font-bold tabular-nums">
                {price.amount}
                <span className="font-sans text-[13px] font-medium text-fg-secondary">{price.suffix}</span>
              </dd>
            </div>
          )}
          {date && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-fg-muted">{date.label}</dt>
              <dd className="m-0 font-display text-2xl leading-7 font-bold tabular-nums">{date.value}</dd>
            </div>
          )}
        </dl>
      )}
      {notice && (
        <p
          role={notice.tone === "warning" ? "alert" : undefined}
          className={cn(
            "m-0 rounded-md px-3 py-2.5 text-[13px] leading-[18px] text-pretty",
            notice.tone === "warning" ? "bg-warning/14 text-fg" : "bg-accent/14 text-fg",
          )}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}
