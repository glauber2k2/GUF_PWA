"use client";

import { CreditCard, RotateCcw, Undo2, XCircle } from "lucide-react";
import { subscriptionStatusText, subscriptionViewOf, withdrawalNotice, type BillingSubscription } from "@guf/core";
import { Banner, Button, ConfirmDialog } from "@/shared/components/ds";
import { useSubscriptionActions } from "@/features/plans/hooks/use-subscription-actions";

export interface SubscriptionCardProps {
  subscription: BillingSubscription;
  /** Sem internet as ações ficam indisponíveis (a situação continua visível). */
  canManage: boolean;
}

/** Cartão da assinatura: situação, prazo de desistência e as ações que cabem na situação. */
export function SubscriptionCard({ subscription, canManage }: SubscriptionCardProps) {
  const actions = useSubscriptionActions(subscription);
  const view = subscriptionViewOf(subscription);
  const notice = withdrawalNotice(subscription);
  const isLive = view === "withdrawable" || view === "active" || view === "past_due" || view === "canceling";

  return (
    <section aria-labelledby="subscription-title" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="subscription-title" className="m-0 text-lg leading-6 font-bold">
          Assinatura {subscription.planName}
        </h2>
        <p className="m-0 text-sm leading-5 text-fg-secondary">{subscriptionStatusText(subscription)}</p>
      </div>

      {view === "past_due" && (
        <Banner tone="warning" title="Pagamento pendente">
          Não conseguimos cobrar seu cartão. Atualize o pagamento para manter o {subscription.planName}.
        </Banner>
      )}
      {notice && <p className="m-0 rounded-md bg-accent/12 px-3 py-2 text-sm leading-5 text-fg">{notice}</p>}

      <div className="flex flex-col gap-2">
        {view === "refunding" && (
          <Button variant="secondary" fullWidth icon={RotateCcw} loading={actions.isCanceling} disabled={!canManage} onClick={actions.retryRefund}>
            Concluir devolução
          </Button>
        )}
        {view === "canceling" && (
          <Button variant="secondary" fullWidth icon={Undo2} loading={actions.isReactivating} disabled={!canManage} onClick={actions.reactivateNow}>
            Reativar assinatura
          </Button>
        )}
        {isLive && subscription.canManagePayment && (
          <Button variant="secondary" fullWidth icon={CreditCard} loading={actions.isOpeningPortal} disabled={!canManage} onClick={actions.openPortal}>
            {view === "past_due" ? "Atualizar pagamento" : "Pagamento e recibos"}
          </Button>
        )}
        {isLive && view !== "canceling" && (
          <Button variant="outline" fullWidth icon={XCircle} loading={actions.isCanceling} disabled={!canManage} onClick={actions.askCancel}>
            Cancelar assinatura
          </Button>
        )}
      </div>

      {actions.confirmation && (
        <ConfirmDialog
          placement="screen"
          balanced
          open={actions.isConfirmOpen}
          title={actions.confirmation.title}
          message={actions.confirmation.message}
          cancelLabel="Voltar"
          confirmLabel={actions.confirmation.confirmLabel}
          onCancel={actions.dismissCancel}
          onConfirm={actions.confirmCancel}
        />
      )}
    </section>
  );
}
