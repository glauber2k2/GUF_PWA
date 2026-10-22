"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { plansApi, type ApiError, type PlansApi, type StartSubscriptionInput } from "@guf/api";
import { useAuth } from "@/features/auth";
import { PLANS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { withDeviceCache } from "@/shared/offline/device-cache";
import { mockPlansApi, setPlansMockScenario } from "@/mocks/plans";

/** O plano muda pouco; a tela de planos e o webhook (futuro) recarregam na hora quando muda. */
const ENTITLEMENTS_STALE_MS = 5 * 60_000;

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (Free; `pro` simula o Pro). */
function usePlansSource(): { api: PlansApi; mock: boolean } {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "development") {
    const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase());
    if (values.some(Boolean)) {
      setPlansMockScenario(values.includes("pro") ? "pro" : "free");
      return { api: mockPlansApi, mock: true };
    }
  }
  return { api: plansApi, mock: false };
}

/**
 * Direitos do usuário logado. Guardados no aparelho: sem internet vale a última resposta
 * (e, sem nenhuma, nada é bloqueado no app; o banco continua barrando as gravações).
 */
export function useEntitlements() {
  const { user } = useAuth();
  const { api, mock } = usePlansSource();
  return useQuery({
    queryKey: [PLANS_KEY, "entitlements", user?.id, mock],
    enabled: Boolean(user) || mock,
    staleTime: ENTITLEMENTS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await withDeviceCache(`entitlements:${user?.id ?? "mock"}`, () =>
        api.getEntitlements(getSupabaseClient(), null),
      );
      if (error) throw error;
      return data.value;
    },
  });
}

/** Planos do catálogo (comparação na tela de planos). */
export function usePlanCatalog() {
  const { api, mock } = usePlansSource();
  return useQuery({
    queryKey: [PLANS_KEY, "catalog", mock],
    staleTime: ENTITLEMENTS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await withDeviceCache("plan-catalog", () => api.getPlanCatalog(getSupabaseClient(), null));
      if (error) throw error;
      return data.value;
    },
  });
}

/** Documentos a aceitar na assinatura (Termos da Assinatura + pendências do cadastro). */
export function useSubscriptionDocuments() {
  const { user } = useAuth();
  const { api, mock } = usePlansSource();
  return useQuery({
    queryKey: [PLANS_KEY, "subscription-documents", user?.id, mock],
    enabled: Boolean(user) || mock,
    queryFn: async () => {
      const { data, error } = await api.getSubscriptionDocuments(getSupabaseClient(), null);
      if (error) throw error;
      return data;
    },
  });
}

/** Inicia a assinatura (aceites + pagamento; hoje responde billing_unavailable). */
export function useStartSubscription() {
  const { api } = usePlansSource();
  return useMutation<null, ApiError, StartSubscriptionInput>({
    mutationFn: async (input) => {
      const { error } = await api.startSubscription(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
  });
}

/** O treino (aberto por link) existe, mas está fora do histórico do plano? Só consulta quando `enabled`. */
export function useSessionHiddenByPlan(sessionId: string | null, enabled: boolean) {
  const { api, mock } = usePlansSource();
  return useQuery({
    queryKey: [PLANS_KEY, "hidden-session", sessionId, mock],
    enabled: enabled && sessionId !== null,
    queryFn: async () => {
      const { data, error } = await api.isSessionHiddenByPlan(getSupabaseClient(), { sessionId: sessionId ?? "" });
      if (error) throw error;
      return data;
    },
  });
}
