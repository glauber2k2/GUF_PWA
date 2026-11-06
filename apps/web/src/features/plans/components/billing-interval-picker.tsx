import { BILLING_INTERVAL_OPTION_LABELS, type BillingInterval } from "@guf/core";
import { SegmentedControl } from "@/shared/components/ds";
import type { ProOffer } from "@/features/plans/hooks/use-pro-offer";

export interface BillingIntervalPickerProps {
  /** Periodicidades à venda, na ordem da tela (`availableIntervals`). */
  intervals: readonly BillingInterval[];
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  /** Economia do anual sobre 12 meses do mensal (null = não mostra). */
  annualSavingsPercent: number | null;
  className?: string;
}

function optionLabel(interval: BillingInterval, savingsPercent: number | null): string {
  const label = BILLING_INTERVAL_OPTION_LABELS[interval];
  return interval === "year" && savingsPercent ? `${label} · −${savingsPercent}%` : label;
}

/** Mensal ou anual. Some quando só uma periodicidade está à venda. */
export function BillingIntervalPicker({ intervals, value, onChange, annualSavingsPercent, className }: BillingIntervalPickerProps) {
  if (intervals.length < 2) return null;
  return (
    <SegmentedControl
      label="Periodicidade da assinatura"
      className={className}
      options={intervals.map((interval) => ({ value: interval, label: optionLabel(interval, annualSavingsPercent) }))}
      value={value}
      onChange={(next) => onChange(next as BillingInterval)}
    />
  );
}

/** Seletor ligado à oferta (`useProOffer`): mesma escolha no cartão, na tela do Pro e na barra de assinar. */
export function OfferIntervalPicker({
  offer,
  className,
}: {
  offer: Pick<ProOffer, "intervals" | "interval" | "setInterval" | "annualSavingsPercent">;
  className?: string;
}) {
  if (!offer.interval) return null;
  return (
    <BillingIntervalPicker
      intervals={offer.intervals}
      value={offer.interval}
      onChange={offer.setInterval}
      annualSavingsPercent={offer.annualSavingsPercent}
      className={className}
    />
  );
}
