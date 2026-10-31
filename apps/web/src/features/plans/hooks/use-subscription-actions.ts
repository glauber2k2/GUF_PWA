"use client";

import { useState } from "react";
import type { ApiError } from "@guf/api";
import { cancelConfirmationCopy, cancellationResultCopy, type BillingSubscription } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useCancelSubscription, useOpenBillingPortal, useReactivateSubscription } from "@/features/plans/api/use-billing";

/** Ações da assinatura (cancelar com confirmação, reativar, portal) com os avisos de cada resultado. */
export function useSubscriptionActions(subscription: BillingSubscription | null) {
  const { showToast } = useAppShell();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const cancel = useCancelSubscription();
  const reactivate = useReactivateSubscription();
  const portal = useOpenBillingPortal();

  const showError = (title: string) => (error: ApiError) => showToast(title, { tone: "error", message: error.message });

  const confirmCancel = () => {
    if (!subscription) return;
    setIsConfirmOpen(false);
    cancel.mutate(
      { subscriptionId: subscription.id },
      {
        onSuccess: (outcome) => {
          const copy = cancellationResultCopy(outcome, subscription.currentPeriodEnd);
          showToast(copy.title, { tone: copy.tone, message: copy.message });
        },
        onError: showError("Não foi possível cancelar"),
      },
    );
  };

  /** Devolução que ficou sem resposta do gateway: o mesmo pedido de novo (nunca devolve duas vezes). */
  const retryRefund = () => {
    if (!subscription) return;
    cancel.mutate(
      { subscriptionId: subscription.id },
      {
        onSuccess: (outcome) => {
          const copy = cancellationResultCopy(outcome, subscription.currentPeriodEnd);
          showToast(outcome.refund === "refunded" ? "Devolução confirmada" : copy.title, { tone: copy.tone, message: copy.message });
        },
        onError: showError("Não foi possível concluir a devolução"),
      },
    );
  };

  const reactivateNow = () => {
    if (!subscription) return;
    reactivate.mutate(
      { subscriptionId: subscription.id },
      {
        onSuccess: () => showToast("Assinatura reativada", { tone: "success", message: "A renovação volta a acontecer normalmente." }),
        onError: showError("Não foi possível reativar"),
      },
    );
  };

  const openPortal = () => portal.mutate(undefined, { onError: showError("Não foi possível abrir o pagamento") });

  return {
    confirmation: subscription ? cancelConfirmationCopy(subscription) : null,
    isConfirmOpen,
    askCancel: () => setIsConfirmOpen(true),
    dismissCancel: () => setIsConfirmOpen(false),
    confirmCancel,
    retryRefund,
    reactivateNow,
    openPortal,
    isCanceling: cancel.isPending,
    isReactivating: reactivate.isPending,
    isOpeningPortal: portal.isPending,
  };
}
