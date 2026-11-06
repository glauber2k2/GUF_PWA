/**
 * Preços à venda na tela: periodicidades, equivalente mensal (o anual aparece como "R$ 12,33/mês"),
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

export interface AnnualSavings {
  /** Economia sobre 12 meses do mensal, em % inteiro (ex.: 17). */
  percent: number;
  /** Economia no ano, em centavos (12 × mensal − anual). */
  amountCents: number;
  /** Quantos meses inteiros do mensal a economia paga (0 = menos de um mês). */
  freeMonths: number;
  currency: string;
}

/**
 * Quanto o anual economiza sobre 12 meses do mensal, comparando os preços à venda agora.
 * @returns a economia ou null sem os dois preços, com moedas diferentes ou sem economia
 */
export function annualSavings(prices: readonly PlanPrice[], planCode: string): AnnualSavings | null {
  const monthly = findPlanPrice(prices, planCode, "month");
  const yearly = findPlanPrice(prices, planCode, "year");
  if (!monthly || !yearly || monthly.currency !== yearly.currency || monthly.amountCents <= 0) return null;
  const twelveMonthsCents = monthly.amountCents * MONTHS_PER_INTERVAL.year;
  const amountCents = twelveMonthsCents - yearly.amountCents;
  const percent = Math.round((amountCents / twelveMonthsCents) * 100);
  if (amountCents <= 0 || percent <= 0) return null;
  return { percent, amountCents, freeMonths: Math.floor(amountCents / monthly.amountCents), currency: yearly.currency };
}

/** Selo do anual no seletor: "2 meses grátis" quando a economia paga meses inteiros do mensal; senão "−17%". */
export function formatSavingsBadge(savings: AnnualSavings): string {
  if (savings.freeMonths === 1) return "1 mês grátis";
  if (savings.freeMonths > 1) return `${savings.freeMonths} meses grátis`;
  return `−${savings.percent}%`;
}

/** "Você economiza R$ 29,60 por ano em relação ao mensal." */
export function formatAnnualSavings(savings: AnnualSavings): string {
  return `Você economiza ${formatMoney(savings.amountCents, savings.currency)} por ano em relação ao mensal.`;
}

export interface PriceDisplay {
  /** Valor em destaque, sempre por mês: "R$ 12,33". */
  amount: string;
  suffix: "/mês";
  /** Como é cobrado: "R$ 148,00 cobrados uma vez por ano" ou "Cobrado todo mês". */
  billedText: string;
  /** Promoção por tempo limitado e o preço que vale depois (null = preço normal). */
  promotion: { label: string; regularText: string } | null;
  /** O que vale na renovação (só sem promoção; com promoção, o `regularText` já diz). */
  renewalNote: string | null;
}

/**
 * Aviso de renovação sem preço "depois" definido: o valor vale o período pago e uma mudança
 * segue a regra dos Termos da Assinatura (aviso antes, só na renovação seguinte).
 */
const RENEWAL_NOTE: Record<BillingInterval, string | null> = {
  month: null,
  year: "Preço garantido pelos 12 meses. Se mudar na renovação, avisamos antes.",
};

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
    renewalNote: price.regularAmountCents ? null : RENEWAL_NOTE[price.interval],
  };
}

/** "Pro anual · R$ 148,00 por ano" — resumo do que será cobrado, para a barra de assinar. */
export function formatChargeSummary(planName: string, price: PlanPrice): string {
  return `${planName} ${BILLING_INTERVAL_OPTION_LABELS[price.interval].toLowerCase()} · ${formatMoney(price.amountCents, price.currency)} ${PERIOD_TOTAL_TEXT[price.interval]}`;
}
