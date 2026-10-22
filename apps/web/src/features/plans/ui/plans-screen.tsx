"use client";

import { useSearchParams } from "next/navigation";
import { Crown } from "lucide-react";
import { formatDayMonthYear, isPlanFeature, type CatalogPlan } from "@guf/core";
import { Banner, Icon, Skeleton } from "@/shared/components/ds";
import { DetailHeader } from "@/shared/components/detail-header";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useAppShell } from "@/features/app-shell";
import { usePlanCatalog, useStartSubscription, useSubscriptionDocuments } from "@/features/plans/api/use-plans";
import { PlanComparison } from "@/features/plans/components/plan-comparison";
import { SubscribePanel } from "@/features/plans/components/subscribe-panel";
import { usePlanGate } from "@/features/plans/hooks/use-plan-gate";

/** /planos?recurso=<funcionalidade> — plano atual, comparação e assinatura do Pro. */
export function PlansScreen() {
  const goBack = useGoBack();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { showToast } = useAppShell();
  const { entitlements } = usePlanGate();
  const catalog = usePlanCatalog();
  const documents = useSubscriptionDocuments();
  const subscribe = useStartSubscription();

  const requested = searchParams.get("recurso");
  const highlight = requested && isPlanFeature(requested) ? requested : null;
  const plans = catalog.data ?? [];
  const currentRank = plans.find((p) => p.code === entitlements?.planCode)?.rank ?? 0;
  const upgrade = plans.find((p) => p.isPurchasable && p.rank > currentRank) ?? null;

  const onSubscribe = (plan: CatalogPlan, acceptedDocumentIds: string[]) =>
    subscribe.mutate(
      { planCode: plan.code, acceptedDocumentIds, platform: "web" },
      {
        onError: (error) =>
          showToast(error.code === "billing_unavailable" ? "Assinatura em breve" : "Não foi possível assinar", {
            tone: error.code === "billing_unavailable" ? "info" : "error",
            message: error.message,
          }),
      },
    );

  return (
    <main className="flex flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom))]">
      <DetailHeader title="Planos" onBack={goBack} />
      <div className="flex flex-col gap-4 pt-2">
        {!online && (
          <Banner tone="warning" title="Sem conexão">
            para assinar, conecte-se à internet.
          </Banner>
        )}
        <CurrentPlanCard planName={entitlements?.planName ?? null} isDefault={entitlements?.isDefaultPlan ?? true} validUntil={entitlements?.validUntil ?? null} />
        {catalog.isPending ? (
          <Skeleton className="h-[280px] rounded-lg" />
        ) : catalog.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void catalog.refetch()}>
            Não foi possível carregar os planos. Verifique a internet e tente de novo.
          </Banner>
        ) : (
          <PlanComparison plans={plans} currentPlanCode={entitlements?.planCode ?? null} highlight={highlight} />
        )}
        {upgrade && (
          <SubscribePanel
            plan={upgrade}
            documents={documents.data ?? []}
            documentsError={documents.isError ? "Não foi possível carregar os termos. Verifique a internet e tente de novo." : null}
            onRetryDocuments={() => void documents.refetch()}
            canSubscribe={online && documents.isSuccess}
            subscribing={subscribe.isPending}
            onSubscribe={(ids) => onSubscribe(upgrade, ids)}
          />
        )}
      </div>
    </main>
  );
}

function CurrentPlanCard({ planName, isDefault, validUntil }: { planName: string | null; isDefault: boolean; validUntil: string | null }) {
  if (!planName) return <Skeleton className="h-[76px] rounded-lg" />;
  return (
    <section aria-label="Seu plano" className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="grid size-11 flex-none place-items-center rounded-md bg-accent/16 text-accent-text">
        <Icon icon={Crown} size={22} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] leading-[18px] text-fg-muted">Seu plano</span>
        <strong className="text-lg leading-6">{planName}</strong>
        {!isDefault && validUntil && (
          <span className="text-[13px] leading-[18px] text-fg-secondary">Válido até {formatDayMonthYear(new Date(validUntil))}</span>
        )}
      </span>
    </section>
  );
}
