"use client";

import { useEffect } from "react";
import { ChevronRight, Crown, Lock, ShieldCheck, Undo2, X, type LucideIcon } from "lucide-react";
import {
  formatFeatureUpgrade,
  formatIntervalSuffix,
  formatMoney,
  PLAN_FEATURE_LABELS,
  planUpsellCopy,
  type Entitlements,
  type PlanFeature,
} from "@guf/core";
import { Button, Icon, IconButton, ScreenPortal, Skeleton } from "@/shared/components/ds";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { PLAN_FEATURE_ICONS } from "@/features/plans/constants/feature-icons";
import { PlanComparison } from "@/features/plans/components/plan-comparison";
import { SUBSCRIBE_BAR_CLEARANCE, SubscribeBar } from "@/features/plans/components/subscribe-bar";
import { useProOffer } from "@/features/plans/hooks/use-pro-offer";
import { cn } from "@/shared/helpers/class-names";

/** Atraso entre um destaque e o próximo na entrada (ms). */
const HIGHLIGHT_STAGGER_MS = 80;
const HIGHLIGHT_FIRST_DELAY_MS = 460;

const TRUST_LINES: ReadonlyArray<{ icon: LucideIcon; text: string }> = [
  { icon: ShieldCheck, text: "Cancele quando quiser, aqui no app, sem multa" },
  { icon: Undo2, text: "Desistiu em até 7 dias? Devolvemos o valor inteiro" },
  { icon: Lock, text: "Pagamento seguro na página do Stripe" },
];

export interface ProUpsellScreenProps {
  /** Funcionalidade que a pessoa tentou usar; null = fechada. */
  feature: PlanFeature | null;
  entitlements: Entitlements | null;
  onSeePlans: () => void;
  onClose: () => void;
}

/**
 * Tela do Pro: aparece na hora de USAR algo além do plano (a pessoa preencheu tudo e tocou em salvar,
 * abriu um período ou mandou a pergunta). Fica por cima de folhas e telas cheias (z-[70], como os
 * diálogos); o que estava na tela continua lá ao fechar. Os dados só são buscados com ela aberta.
 */
export function ProUpsellScreen({ feature, ...props }: ProUpsellScreenProps) {
  if (!feature) return null;
  return <ProUpsellContent feature={feature} {...props} />;
}

function ProUpsellContent({ feature, entitlements, onSeePlans, onClose }: ProUpsellScreenProps & { feature: PlanFeature }) {
  const online = useOnlineStatus();
  const offer = useProOffer();
  const copy = planUpsellCopy(feature, entitlements);
  const { upgrade, currentPlan, upgradePrice: price } = offer;
  // O que a pessoa tentou usar vem primeiro.
  const highlights = [...offer.highlights].sort((a, b) => Number(b === feature) - Number(a === feature));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-guf-rise-fast" role="dialog" aria-modal="true" aria-labelledby="pro-upsell-title">
        <div className={cn("flex-1 overflow-y-auto", upgrade ? SUBSCRIBE_BAR_CLEARANCE : "pb-[calc(32px+env(safe-area-inset-bottom))]")}>
          <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-5 pt-[calc(12px+env(safe-area-inset-top))]">
            <div className="-ml-2 flex h-11 items-center">
              <IconButton icon={X} label="Fechar" variant="ghost" onClick={onClose} />
            </div>

            <header className="flex flex-col items-center gap-4 text-center">
              <span className="relative grid size-[72px] place-items-center">
                <span aria-hidden className="absolute inset-0 rounded-[22px] border-2 border-accent opacity-0 motion-safe:animate-[ping_1.8s_cubic-bezier(.05,.7,.1,1)_600ms_2_both]" />
                <span className="grid size-[72px] place-items-center rounded-[22px] bg-accent text-accent-foreground">
                  <Icon icon={Crown} size={34} />
                </span>
              </span>
              <div className="flex animate-guf-rise flex-col gap-2 [animation-delay:120ms]">
                <p className="m-0 text-[11px] leading-4 font-bold tracking-[0.08em] text-accent-text uppercase">Isso faz parte do {upgrade?.name ?? "Pro"}</p>
                <h1 id="pro-upsell-title" className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-balance">
                  {copy.title}
                </h1>
                <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">{copy.message}</p>
              </div>
            </header>

            {offer.catalog.isPending ? (
              <Skeleton className="h-[160px] rounded-xl" />
            ) : (
              price && (
                <section
                  aria-label="Preço"
                  className="flex animate-guf-rise flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-accent-text bg-accent/10 px-5 pt-6 pb-5 text-center [animation-delay:240ms]"
                >
                  <p className="m-0 flex items-baseline justify-center gap-1.5 text-accent-text">
                    <span className="font-display text-[56px] leading-[56px] font-bold tracking-[-0.01em] tabular-nums">
                      {formatMoney(price.amountCents, price.currency)}
                    </span>
                    <span className="text-[15px] font-semibold text-fg-secondary">{formatIntervalSuffix(price.interval)}</span>
                  </p>
                  <span className="text-[13px] leading-[18px] text-fg-secondary">Renova automaticamente até você cancelar</span>
                </section>
              )
            )}

            {upgrade && currentPlan && highlights.length > 0 && (
              <section aria-labelledby="pro-upsell-gains" className="flex flex-col gap-3">
                <h2 id="pro-upsell-gains" className="m-0 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
                  O que você ganha
                </h2>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {highlights.map((item, index) => (
                    <li
                      key={item}
                      // Atraso escalonado da entrada: valor dinâmico por item.
                      style={{ animationDelay: `${HIGHLIGHT_FIRST_DELAY_MS + index * HIGHLIGHT_STAGGER_MS}ms` }}
                      className={cn(
                        "flex animate-guf-rise items-start gap-3.5 rounded-lg border bg-surface p-3.5",
                        item === feature ? "border-accent-text" : "border-border",
                      )}
                    >
                      <span className="grid size-11 flex-none place-items-center rounded-md bg-accent/14 text-accent-text">
                        <Icon icon={PLAN_FEATURE_ICONS[item]} size={22} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <strong className="text-[15px] leading-5 font-semibold">{PLAN_FEATURE_LABELS[item]}</strong>
                        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">{formatFeatureUpgrade(item, currentPlan, upgrade)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {offer.plans.length > 1 && <PlanComparison plans={offer.plans} highlight={feature} className="animate-guf-rise [animation-delay:1000ms]" />}

            <ul className="m-0 flex list-none flex-col gap-2.5 px-1 pt-1">
              {TRUST_LINES.map((line) => (
                <li key={line.text} className="flex items-center gap-2.5 text-[13px] text-fg-secondary">
                  <Icon icon={line.icon} size={18} className="flex-none text-accent-text" />
                  {line.text}
                </li>
              ))}
            </ul>

            <Button variant="ghost" fullWidth iconRight={ChevronRight} onClick={onSeePlans}>
              Ver todos os detalhes do plano
            </Button>
          </div>
        </div>

        {upgrade && (
          <SubscribeBar
            plan={upgrade}
            price={price}
            documents={offer.documents}
            documentsError={offer.documentsError}
            onRetryDocuments={offer.retryDocuments}
            canSubscribe={online && offer.isReadyToSubscribe && !offer.hasLiveSubscription}
            subscribing={offer.isSubscribing}
            onSubscribe={offer.startSubscription}
            showSummary
          />
        )}
      </div>
    </ScreenPortal>
  );
}
