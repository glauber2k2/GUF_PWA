"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  billingApi,
  type ApiError,
  type BillingApi,
  type ConfirmStorePurchaseInput,
  type PrepareStorePurchaseInput,
  type StorePurchaseStatus,
} from "@guf/api";
import type { BillingProviderId, CancellationOutcome } from "@guf/core";
import { useAuth } from "@/features/auth";
import { PLANS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { BILLING_MOCK_SCENARIOS, mockBillingApi, setBillingMockScenario, type BillingMockScenario } from "@/mocks/billing";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (cenários em mocks/billing.ts). */
function useBillingSource(): { api: BillingApi; mock: boolean } {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "development") {
    const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase());
    if (values.some(Boolean)) {
      const chosen = BILLING_MOCK_SCENARIOS.find((s) => values.includes(s)) ?? ("none" satisfies BillingMockScenario);
      setBillingMockScenario(chosen);
      return { api: mockBillingApi, mock: true };
    }
  }
  return { api: billingApi, mock: false };
}

/** Preços à venda no gateway informado (Stripe na web; Google Play no app da Play). */
export function usePlanPrices(provider: BillingProviderId) {
  const { api, mock } = useBillingSource();
  return useQuery({
    queryKey: [PLANS_KEY, "prices", provider, mock],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api.getPlanPrices(getSupabaseClient(), { provider });
      if (error) throw error;
      return data;
    },
  });
}

/** Assinatura e pagamentos do usuário. `pollMs` = conferir de novo (retorno do checkout). */
export function useMyBilling(pollMs: number | false = false) {
  const { user } = useAuth();
  const { api, mock } = useBillingSource();
  return useQuery({
    queryKey: [PLANS_KEY, "billing", user?.id, mock],
    enabled: Boolean(user) || mock,
    refetchInterval: pollMs,
    queryFn: async () => {
      const { data, error } = await api.getMyBilling(getSupabaseClient(), null);
      if (error) throw error;
      return data;
    },
  });
}

/** Depois de qualquer mudança na assinatura: plano, direitos e cobrança recarregam. */
function useInvalidatePlans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [PLANS_KEY] });
}

export function useCancelSubscription() {
  const { api } = useBillingSource();
  const invalidate = useInvalidatePlans();
  return useMutation<CancellationOutcome, ApiError, { subscriptionId: string }>({
    mutationFn: async (input) => {
      const { data, error } = await api.cancelSubscription(getSupabaseClient(), input);
      if (error) throw error;
      return data;
    },
    onSettled: invalidate,
  });
}

export function useReactivateSubscription() {
  const { api } = useBillingSource();
  const invalidate = useInvalidatePlans();
  return useMutation<null, ApiError, { subscriptionId: string }>({
    mutationFn: async (input) => {
      const { error } = await api.reactivateSubscription(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
    onSettled: invalidate,
  });
}

/** Abre o portal do gateway (trocar cartão, ver faturas) na mesma aba. */
export function useOpenBillingPortal() {
  const { api } = useBillingSource();
  return useMutation<string, ApiError, void>({
    mutationFn: async () => {
      const { data, error } = await api.openBillingPortal(getSupabaseClient(), null);
      if (error) throw error;
      return data.url;
    },
    onSuccess: (url) => window.location.assign(url),
  });
}

/** Compra feita na loja (Google Play): o token vai ao servidor e `finish` fecha a janela da loja. */
export interface StorePurchaseResult {
  purchaseToken: string;
  finish: (isConfirmed: boolean) => Promise<void>;
}

/**
 * Assinar pela loja de apps: aceites e produto no servidor → compra na loja → conferência no
 * servidor. A compra na loja entra por parâmetro (Google Play hoje; outra loja amanhã).
 */
export function useStoreSubscription(purchaseInStore: (productId: string) => Promise<StorePurchaseResult>) {
  const { api } = useBillingSource();
  const invalidate = useInvalidatePlans();
  return useMutation<StorePurchaseStatus, unknown, PrepareStorePurchaseInput>({
    mutationFn: async (input) => {
      const prepared = await api.prepareStorePurchase(getSupabaseClient(), input);
      if (prepared.error) throw prepared.error;
      const { productId } = prepared.data;
      const purchase = await purchaseInStore(productId);
      const confirmed = await api.confirmStorePurchase(getSupabaseClient(), { provider: input.provider, purchaseToken: purchase.purchaseToken, productId });
      await purchase.finish(!confirmed.error);
      if (confirmed.error) throw confirmed.error;
      return confirmed.data.status;
    },
    onSettled: invalidate,
  });
}

/** Confirma no servidor uma compra já feita na loja (ex.: o app fechou antes da confirmação). */
export function useConfirmStorePurchase() {
  const { api } = useBillingSource();
  const invalidate = useInvalidatePlans();
  return useMutation<StorePurchaseStatus, ApiError, ConfirmStorePurchaseInput>({
    mutationFn: async (input) => {
      const { data, error } = await api.confirmStorePurchase(getSupabaseClient(), input);
      if (error) throw error;
      return data.status;
    },
    onSuccess: invalidate,
  });
}
