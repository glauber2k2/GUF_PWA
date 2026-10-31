"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { billingApi, type ApiError, type BillingApi } from "@guf/api";
import type { CancellationOutcome } from "@guf/core";
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

/** Preços à venda. */
export function usePlanPrices() {
  const { api, mock } = useBillingSource();
  return useQuery({
    queryKey: [PLANS_KEY, "prices", mock],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api.getPlanPrices(getSupabaseClient(), null);
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
