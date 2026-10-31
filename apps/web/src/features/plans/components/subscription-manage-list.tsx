"use client";

import { ChevronRight, CircleX, CreditCard, RotateCcw, Undo2, type LucideIcon } from "lucide-react";
import { formatDayMonthYear, formatMoney, subscriptionViewOf, type BillingPayment, type BillingSubscription } from "@guf/core";
import { ConfirmDialog, GufLoader, Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { useSubscriptionActions } from "@/features/plans/hooks/use-subscription-actions";

export interface SubscriptionManageListProps {
  subscription: BillingSubscription;
  /** Pagamento mais recente (aparece na linha do portal). */
  lastPayment: BillingPayment | null;
  /** Sem internet as ações ficam indisponíveis (a situação continua visível). */
  canManage: boolean;
}

/** "Assinatura": pagamento e recibos, reativar, concluir devolução e cancelar, conforme a situação. */
export function SubscriptionManageList({ subscription, lastPayment, canManage }: SubscriptionManageListProps) {
  const actions = useSubscriptionActions(subscription);
  const view = subscriptionViewOf(subscription);
  const isLive = view === "withdrawable" || view === "active" || view === "past_due" || view === "canceling";
  const paymentDescription = lastPayment
    ? `Último: ${formatDayMonthYear(new Date(lastPayment.paidAt))} · ${formatMoney(lastPayment.amountCents, lastPayment.currency)}`
    : "Cartão, faturas e recibos";

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      {isLive && subscription.canManagePayment && (
        <ManageRow
          icon={CreditCard}
          title={view === "past_due" ? "Atualizar pagamento" : "Pagamento e recibos"}
          description={paymentDescription}
          loading={actions.isOpeningPortal}
          disabled={!canManage}
          onClick={actions.openPortal}
        />
      )}
      {view === "canceling" && (
        <ManageRow
          icon={Undo2}
          title="Reativar assinatura"
          description="A renovação volta a acontecer normalmente"
          loading={actions.isReactivating}
          disabled={!canManage}
          onClick={actions.reactivateNow}
        />
      )}
      {view === "refunding" && (
        <ManageRow
          icon={RotateCcw}
          title="Concluir devolução"
          description="Pede de novo a devolução, sem cobrar duas vezes"
          loading={actions.isCanceling}
          disabled={!canManage}
          onClick={actions.retryRefund}
        />
      )}
      {isLive && view !== "canceling" && (
        <ManageRow icon={CircleX} title="Cancelar assinatura" tone="danger" loading={actions.isCanceling} disabled={!canManage} onClick={actions.askCancel} />
      )}

      {actions.confirmation && (
        <ConfirmDialog
          placement="screen"
          balanced
          open={actions.isConfirmOpen}
          title={actions.confirmation.title}
          message={actions.confirmation.message}
          cancelLabel={`Manter o ${subscription.planName}`}
          confirmLabel={actions.confirmation.confirmLabel}
          onCancel={actions.dismissCancel}
          onConfirm={actions.confirmCancel}
        />
      )}
    </div>
  );
}

interface ManageRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "neutral" | "danger";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ManageRow({ icon, title, description, tone = "neutral", loading, disabled, onClick }: ManageRowProps) {
  const isDanger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3.5 border-b border-border bg-transparent px-4 py-2.5 text-left transition-colors duration-150 ease-standard last:border-b-0 disabled:cursor-not-allowed disabled:opacity-60",
        isDanger ? "text-danger hover:bg-danger/10" : "text-fg hover:bg-surface-3",
      )}
    >
      <span className={cn("grid size-9 flex-none place-items-center rounded-md", isDanger ? "bg-danger/16" : "bg-surface-3 text-fg-secondary")}>
        <Icon icon={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <strong className="text-[15px] leading-5 font-semibold">{title}</strong>
        {description && <span className="text-xs leading-4 text-fg-secondary">{description}</span>}
      </span>
      {loading ? <GufLoader variant={8} size={18} /> : !isDanger && <Icon icon={ChevronRight} size={18} className="text-fg-muted" />}
    </button>
  );
}
