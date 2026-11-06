/**
 * Preços à venda na tela: periodicidades, equivalente mensal (o anual aparece como "R$ 11,80/mês"),
 * economia do anual e o aviso de promoção. Os valores vêm SEMPRE de `plan_prices` (nunca escritos no
 * código): mudar preço, criar promoção ou somar periodicidade é só dado no banco.
 */
import { formatMoney, type BillingInterval, type PlanPrice } from "./billing";

export const MONTHS_PER_INTERVAL: Record<BillingInterval, number> = { month: 1, year: 12 };

/** Ordem de exibição: o anual primeiro (é o destaque da oferta). */
export const BILLING_INTERVAL_ORDER: readonly BillingInterval[] = ["year", "month"];

export const BILLING_INTERVAL_OPTION_LABELS: Record<BillingInterval, string> = { month: "Mensal", year: "Anual" };

const BILLED_TEXT: Record<BillingInterval, (total: string) => string> = {
  month: () => "Cobrado todo mês",
  year: (total) => `${total} cobrados uma vez por ano`,
};

const PERIOD_TOTAL_TEXT: Record<BillingInterval, string> = { month: "por mês", year: "por ano" };

export const PROMOTION_LABEL = "Promoção por tempo limitado";

/** Preço por mês (centavos, arredondado): o anual dividido por 12; o mensal, ele mesmo. */
export function monthlyEquivalentCents(amountCents: number, interval: BillingInterval): number {
  return Math.round(amountCents / MONTHS_PER_INTERVAL[interval]);
}

/** Preço de um plano numa periodicidade (null = não está à venda nela). */
export function findPlanPrice(prices: readonly PlanPrice[], planCode: string, interval: BillingInterval): PlanPrice | null {
  return prices.find((price) => price.planCode === planCode && price.interval === interval) ?? null;
}

/** Periodicidades à venda do plano, na ordem da tela. */
export function availableIntervals(prices: readonly PlanPrice[], planCode: string): BillingInterval[] {
  return BILLING_INTERVAL_ORDER.filter((interval) => findPlanPrice(prices, planCode, interval) !== null);
}

/** Periodicidade que a oferta abre selecionada: a primeira à venda na ordem da tela (o anual, se houver). */
export function defaultInterval(prices: readonly PlanPrice[], planCode: string): BillingInterval | null {
  return availableIntervals(prices, planCode)[0] ?? null;
}

/**
 * Quanto o anual economiza sobre 12 meses do mensal, comparando os preços à venda agora.
 * @returns percentual inteiro (ex.: 20) ou null sem os dois preços ou sem economia
 */
export function annualSavingsPercent(prices: readonly PlanPrice[], planCode: string): number | null {
  const monthly = findPlanPrice(prices, planCode, "month");
  const yearly = findPlanPrice(prices, planCode, "year");
  if (!monthly || !yearly) return null;
  const savings = 1 - monthlyEquivalentCents(yearly.amountCents, "year") / monthly.amountCents;
  const percent = Math.round(savings * 100);
  return percent > 0 ? percent : null;
}

export interface PriceDisplay {
  /** Valor em destaque, sempre por mês: "R$ 11,80". */
  amount: string;
  suffix: "/mês";
  /** Como é cobrado: "R$ 118,00 cobrados uma vez por ano" ou "Cobrado todo mês". */
  billedText: string;
  /** Promoção por tempo limitado e o preço que vale depois (null = preço normal). */
  promotion: { label: string; regularText: string } | null;
}

/** "Depois, R$ 19,80/mês." · "Depois, R$ 14,80/mês (R$ 148,00 por ano)." */
function regularPriceText(price: PlanPrice, regularCents: number): string {
  const monthly = `${formatMoney(monthlyEquivalentCents(regularCents, price.interval), price.currency)}/mês`;
  if (price.interval === "month") return `Depois, ${monthly}.`;
  return `Depois, ${monthly} (${formatMoney(regularCents, price.currency)} ${PERIOD_TOTAL_TEXT[price.interval]}).`;
}

/** Textos do preço na oferta (destaque por mês, como é cobrado e a promoção). */
export function buildPriceDisplay(price: PlanPrice): PriceDisplay {
  const total = formatMoney(price.amountCents, price.currency);
  return {
    amount: formatMoney(monthlyEquivalentCents(price.amountCents, price.interval), price.currency),
    suffix: "/mês",
    billedText: BILLED_TEXT[price.interval](total),
    promotion: price.regularAmountCents ? { label: PROMOTION_LABEL, regularText: regularPriceText(price, price.regularAmountCents) } : null,
  };
}

/** "Pro anual · R$ 118,00 por ano" — resumo do que será cobrado, para a barra de assinar. */
export function formatChargeSummary(planName: string, price: PlanPrice): string {
  return `${planName} ${BILLING_INTERVAL_OPTION_LABELS[price.interval].toLowerCase()} · ${formatMoney(price.amountCents, price.currency)} ${PERIOD_TOTAL_TEXT[price.interval]}`;
}
