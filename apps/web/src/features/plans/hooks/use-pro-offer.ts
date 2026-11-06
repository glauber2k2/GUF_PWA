"use client";

import { useState } from "react";
import {
  annualSavingsPercent,
  availableIntervals,
  defaultInterval,
  findPlanPrice,
  improvedFeatures,
  isSubscriptionLive,
  type BillingInterval,
  type PlanPrice,
} from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { usePlanCatalog, useStartSubscription, useSubscriptionDocuments } from "@/features/plans/api/use-plans";
import { useMyBilling, usePlanPrices } from "@/features/plans/api/use-billing";
import { WEB_BILLING_PROVIDER } from "@/features/plans/constants/payment";
import { usePlanGateContext } from "@/features/plans/providers/plan-gate-provider";

const DOCUMENTS_ERROR = "Não foi possível carregar os termos. Verifique a internet e tente de novo.";

/** Periodicidade da oferta: a escolhida pela pessoa ou, até ela escolher, a padrão (o anual). */
function useOfferInterval(prices: readonly PlanPrice[], planCode: string | undefined) {
  const [chosen, setChosen] = useState<BillingInterval | null>(null);
  const intervals = planCode ? availableIntervals(prices, planCode) : [];
  const interval = chosen && intervals.includes(chosen) ? chosen : planCode ? defaultInterval(prices, planCode) : null;
  return { intervals, interval, setInterval: setChosen };
}

/**
 * Oferta do plano acima do atual (tela de planos e tela do Pro): plano, preços à venda (mensal e
 * anual), o que ele melhora, os termos a aceitar e a assinatura. Os dois lugares assinam pelo mesmo
 * caminho e com os mesmos avisos.
 */
export function useProOffer() {
  const { showToast } = useAppShell();
  const { entitlements } = usePlanGateContext();
  const catalog = usePlanCatalog();
  const prices = usePlanPrices(WEB_BILLING_PROVIDER);
  const documents = useSubscriptionDocuments();
  const billing = useMyBilling();
  const subscribe = useStartSubscription();

  const plans = catalog.data ?? [];
  const priceList = prices.data ?? [];
  const currentPlan = plans.find((plan) => plan.code === entitlements?.planCode) ?? null;
  const currentRank = currentPlan?.rank ?? 0;
  const upgrade = plans.find((plan) => plan.isPurchasable && plan.rank > currentRank) ?? null;
  const { intervals, interval, setInterval } = useOfferInterval(priceList, upgrade?.code);
  const upgradePrice = upgrade && interval ? findPlanPrice(priceList, upgrade.code, interval) : null;
  const subscription = billing.data?.subscription ?? null;
  const hasLiveSubscription = Boolean(subscription && isSubscriptionLive(subscription.status));
  const currentPrice = currentPlan ? findPlanPrice(priceList, currentPlan.code, subscription?.interval ?? "month") : null;

  const startSubscription = (acceptedDocumentIds: string[]) => {
    if (!upgrade || !interval) return;
    subscribe.mutate(
      { planCode: upgrade.code, interval, acceptedDocumentIds, platform: "web" },
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
    /** Periodicidades à venda do plano acima (anual primeiro) e a selecionada. */
    intervals,
    interval,
    setInterval,
    annualSavingsPercent: upgrade ? annualSavingsPercent(priceList, upgrade.code) : null,
    /** Preço à venda do plano atual na periodicidade da assinatura (null no gratuito ou sem preço). */
    currentPrice,
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
