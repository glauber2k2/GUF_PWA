"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CHECKOUT_CONFIRM_POLL_MS, CHECKOUT_CONFIRM_TIMEOUT_MS, isSubscriptionLive } from "@guf/core";
import { PLANS_KEY } from "@/shared/libs/query-keys";
import { useMyBilling } from "@/features/plans/api/use-billing";
import { plansPath } from "@/features/plans/helpers/paths";

/** Parâmetro com que o gateway devolve a pessoa depois de pagar (success_url da Edge Function). */
const CHECKOUT_RETURN_PARAM = "assinatura";
const CHECKOUT_RETURN_VALUE = "confirmando";

export type CheckoutConfirmation = "idle" | "confirming" | "delayed";

/**
 * Volta do checkout: o pagamento só vale quando o webhook confirmar, então a tela confere a assinatura a
 * cada poucos segundos por um tempo. Confirmou → recarrega o plano, chama `onConfirmed` e limpa o endereço.
 */
export function useCheckoutConfirmation(onConfirmed: () => void): CheckoutConfirmation {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isReturning = searchParams.get(CHECKOUT_RETURN_PARAM) === CHECKOUT_RETURN_VALUE;
  const [isTimedOut, setIsTimedOut] = useState(false);
  // Um aviso por volta do checkout, mesmo que a tela renderize de novo antes de o endereço mudar.
  const hasNotifiedRef = useRef(false);
  const billing = useMyBilling(isReturning && !isTimedOut ? CHECKOUT_CONFIRM_POLL_MS : false);
  const isConfirmed = Boolean(billing.data?.subscription && isSubscriptionLive(billing.data.subscription.status));

  useEffect(() => {
    if (!isReturning) return;
    const timer = setTimeout(() => setIsTimedOut(true), CHECKOUT_CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isReturning]);

  useEffect(() => {
    if (!isReturning || !isConfirmed || hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    void queryClient.invalidateQueries({ queryKey: [PLANS_KEY] });
    onConfirmed();
    router.replace(plansPath());
  }, [isReturning, isConfirmed, onConfirmed, queryClient, router]);

  if (!isReturning || isConfirmed) return "idle";
  return isTimedOut ? "delayed" : "confirming";
}
