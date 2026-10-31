"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { isPlanFeature, subscriptionViewOf, type BillingPayment, type PlanPrice } from "@guf/core";
import { Banner, GufLoader, Skeleton } from "@/shared/components/ds";
import { DetailHeader } from "@/shared/components/detail-header";
import { DetailScreen } from "@/shared/components/detail-screen";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useAppShell } from "@/features/app-shell";
import { FreePlanCard, PaidPlanCard } from "@/features/plans/components/current-plan-card";
import { IncludedFeaturesList } from "@/features/plans/components/included-features-list";
import { PaymentHistory } from "@/features/plans/components/payment-history";
import { PlanComparison } from "@/features/plans/components/plan-comparison";
import { PlanFaq } from "@/features/plans/components/plan-faq";
import { PlanSection } from "@/features/plans/components/plan-section";
import { SUBSCRIBE_BAR_CLEARANCE, SubscribeBar } from "@/features/plans/components/subscribe-bar";
import { SubscriptionManageList } from "@/features/plans/components/subscription-manage-list";
import { UpgradeOfferCard } from "@/features/plans/components/upgrade-offer-card";
import { buildPaidPlanCard } from "@/features/plans/helpers/paid-plan-card";
import { useCheckoutConfirmation, type CheckoutConfirmation } from "@/features/plans/hooks/use-checkout-confirmation";
import { usePlanGate } from "@/features/plans/hooks/use-plan-gate";
import { useProOffer } from "@/features/plans/hooks/use-pro-offer";

/** Valor cobrado de quem assina: o do último pagamento (o preço à venda pode ter mudado depois). */
function chargedPrice(price: PlanPrice | null, lastPayment: BillingPayment | null): PlanPrice | null {
  if (!price || !lastPayment) return price;
  return { ...price, amountCents: lastPayment.amountCents, currency: lastPayment.currency };
}

/** /planos?recurso=<funcionalidade> — plano atual; no gratuito, a oferta do Pro; no pago, a assinatura. */
export function PlansScreen() {
  const goBack = useGoBack();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { showToast } = useAppShell();
  const { entitlements } = usePlanGate();
  const offer = useProOffer();
  const onConfirmed = useCallback(
    () => showToast("Bem-vindo ao Pro", { tone: "success", message: "Pagamento confirmado. Tudo do Pro já está liberado." }),
    [showToast],
  );
  const confirmation = useCheckoutConfirmation(onConfirmed);

  const requested = searchParams.get("recurso");
  const highlight = requested && isPlanFeature(requested) ? requested : null;
  const { subscription, upgrade, currentPlan } = offer;
  const payments = offer.billing.data?.payments ?? [];
  const view = subscriptionViewOf(subscription);
  const hasSubscriptionActions = view !== "none" && view !== "ended";
  const isPaid = entitlements ? !entitlements.isDefaultPlan : false;
  const showSubscribeBar = !isPaid && Boolean(upgrade) && !offer.hasLiveSubscription && confirmation === "idle";

  return (
    <DetailScreen className={showSubscribeBar ? SUBSCRIBE_BAR_CLEARANCE : undefined}>
      <DetailHeader title="Plano" onBack={goBack} />
      <div className="flex flex-col gap-6 pt-2">
        {!online && (
          <Banner tone="warning" title="Sem conexão">
            para assinar ou gerenciar a assinatura, conecte-se à internet.
          </Banner>
        )}
        <CheckoutConfirmationBanner state={confirmation} />

        {!entitlements || offer.catalog.isPending ? (
          <PlansSkeleton />
        ) : offer.catalog.isError || !currentPlan ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void offer.catalog.refetch()}>
            Não foi possível carregar os planos. Verifique a internet e tente de novo.
          </Banner>
        ) : isPaid ? (
          <>
            <PaidPlanCard {...buildPaidPlanCard(entitlements, subscription, chargedPrice(offer.currentPrice, payments[0] ?? null))} />
            <PlanSection id="plan-included" title="Incluído no seu plano" className="animate-guf-rise [animation-delay:120ms]">
              <IncludedFeaturesList plan={currentPlan} />
            </PlanSection>
          </>
        ) : (
          <>
            <FreePlanCard plan={currentPlan} limitedFeatures={offer.highlights} />
            {upgrade && <UpgradeOfferCard plan={upgrade} price={offer.upgradePrice} highlights={offer.highlights} />}
            <PlanSection id="plan-compare" title={upgrade ? `${currentPlan.name} e ${upgrade.name} lado a lado` : "O que cada plano inclui"} className="animate-guf-rise [animation-delay:220ms]">
              <PlanComparison plans={offer.plans} highlight={highlight} />
            </PlanSection>
            <PlanSection id="plan-faq" title="Dúvidas comuns">
              <PlanFaq />
            </PlanSection>
          </>
        )}

        {subscription && hasSubscriptionActions && (
          <PlanSection id="plan-subscription" title="Assinatura">
            <SubscriptionManageList subscription={subscription} lastPayment={payments[0] ?? null} canManage={online} />
            <p className="m-0 px-1 text-xs leading-[17px] text-pretty text-fg-muted">
              Pagamento pelo Stripe. Cancelando em até 7 dias do primeiro pagamento, o valor volta inteiro; depois, o {subscription.planName} continua até o
              fim do período já pago.
            </p>
          </PlanSection>
        )}
        <PaymentHistory payments={payments} />
      </div>

      {showSubscribeBar && upgrade && (
        <SubscribeBar
          plan={upgrade}
          price={offer.upgradePrice}
          documents={offer.documents}
          documentsError={offer.documentsError}
          onRetryDocuments={offer.retryDocuments}
          canSubscribe={online && offer.isReadyToSubscribe}
          subscribing={offer.isSubscribing}
          onSubscribe={offer.startSubscription}
        />
      )}
    </DetailScreen>
  );
}

function PlansSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-[120px] rounded-lg" />
      <Skeleton className="h-[220px] rounded-lg" />
      <Skeleton className="h-[280px] rounded-lg" />
    </div>
  );
}

/** Volta do pagamento enquanto o gateway ainda não confirmou (o Pro só é liberado pela confirmação). */
function CheckoutConfirmationBanner({ state }: { state: CheckoutConfirmation }) {
  if (state === "idle") return null;
  if (state === "delayed") {
    return (
      <Banner tone="info" title="Pagamento em confirmação">
        Assim que o pagamento for confirmado, o Pro aparece aqui. Pix e alguns cartões podem levar alguns minutos.
      </Banner>
    );
  }
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <GufLoader variant={8} size={28} />
      <span className="text-sm leading-5 text-fg-secondary">Confirmando seu pagamento…</span>
    </div>
  );
}
