"use client";

import { followRequestsTitle } from "@guf/core";
import { usePublishNavAlert } from "@/store/global/nav-alerts.store";
import { useMySocial } from "@/features/social/api/use-social";

/** De quanto em quanto tempo os pedidos pendentes são conferidos com o app aberto. */
const FOLLOW_REQUESTS_POLL_MS = 60_000;

/** Bolinha na aba Perfil enquanto houver pedidos para seguir esperando resposta. */
export function useFollowRequestsAlert(): void {
  const social = useMySocial({ pollMs: FOLLOW_REQUESTS_POLL_MS });
  const pending = social.data?.pendingRequestsCount ?? 0;
  usePublishNavAlert("profile", "follow-requests", pending > 0 ? { label: followRequestsTitle(pending) } : null);
}
