import { formatDayMonthYear, formatMoney, paymentStatusLabel, type BillingPayment } from "@guf/core";
import { PlanSection } from "@/features/plans/components/plan-section";

/** Pagamentos da pessoa (valor, data e se houve devolução). Recibos completos ficam no portal do gateway. */
export function PaymentHistory({ payments }: { payments: BillingPayment[] }) {
  if (payments.length === 0) return null;
  return (
    <PlanSection id="plan-payments" title="Pagamentos">
      <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-border bg-surface p-0">
        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-lg leading-6 font-semibold tabular-nums">{formatMoney(payment.amountCents, payment.currency)}</span>
              <span className="text-[13px] leading-[18px] text-fg-muted">{formatDayMonthYear(new Date(payment.paidAt))}</span>
            </span>
            <span className="text-right text-[13px] leading-[18px] text-fg-secondary">{paymentStatusLabel(payment)}</span>
          </li>
        ))}
      </ul>
    </PlanSection>
  );
}
