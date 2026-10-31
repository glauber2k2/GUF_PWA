"use client";

import { improvedFeatures, isSubscriptionLive } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { usePlanCatalog, useStartSubscription, useSubscriptionDocuments } from "@/features/plans/api/use-plans";
import { useMyBilling, usePlanPrices } from "@/features/plans/api/use-billing";
import { usePlanGateContext } from "@/features/plans/providers/plan-gate-provider";

const DOCUMENTS_ERROR = "Não foi possível carregar os termos. Verifique a internet e tente de novo.";

/**
 * Oferta do plano acima do atual (tela de planos e tela do Pro): plano, preço à venda, o que ele melhora,
 * os termos a aceitar e a assinatura. Os dois lugares assinam pelo mesmo caminho e com os mesmos avisos.
 */
export function useProOffer() {
  const { showToast } = useAppShell();
  const { entitlements } = usePlanGateContext();
  const catalog = usePlanCatalog();
  const prices = usePlanPrices();
  const documents = useSubscriptionDocuments();
  const billing = useMyBilling();
  const subscribe = useStartSubscription();

  const plans = catalog.data ?? [];
  const currentPlan = plans.find((plan) => plan.code === entitlements?.planCode) ?? null;
  const currentRank = currentPlan?.rank ?? 0;
  const upgrade = plans.find((plan) => plan.isPurchasable && plan.rank > currentRank) ?? null;
  const priceOf = (planCode: string | undefined) => prices.data?.find((price) => price.planCode === planCode) ?? null;
  const upgradePrice = upgrade ? priceOf(upgrade.code) : null;
  const subscription = billing.data?.subscription ?? null;
  const hasLiveSubscription = Boolean(subscription && isSubscriptionLive(subscription.status));

  const startSubscription = (acceptedDocumentIds: string[]) => {
    if (!upgrade) return;
    subscribe.mutate(
      { planCode: upgrade.code, acceptedDocumentIds, platform: "web" },
      {
        onError: (error) => {
          if (error.code === "subscription_documents_outdated") void documents.refetch();
          const isUnavailable = error.code === "billing_unavailable";
          showToast(isUnavailable ? "Assinatura em breve" : "Não foi possível assinar", {
            tone: isUnavailable ? "info" : "error",
            message: error.message,
          });
        },
      },
    );
  };

  return {
    catalog,
    plans,
    currentPlan,
    upgrade,
    upgradePrice,
    /** Preço à venda do plano atual (plano pago; null no gratuito ou sem preço cadastrado). */
    currentPrice: priceOf(currentPlan?.code),
    /** O que o plano acima dá a mais que o atual, na ordem do catálogo. */
    highlights: currentPlan && upgrade ? improvedFeatures(currentPlan, upgrade) : [],
    billing,
    subscription,
    hasLiveSubscription,
    documents: documents.data ?? [],
    documentsError: documents.isError ? DOCUMENTS_ERROR : null,
    retryDocuments: () => void documents.refetch(),
    isReadyToSubscribe: documents.isSuccess && billing.isSuccess,
    isSubscribing: subscribe.isPending,
    startSubscription,
  };
}

export type ProOffer = ReturnType<typeof useProOffer>;
