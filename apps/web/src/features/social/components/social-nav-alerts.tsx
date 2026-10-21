"use client";

import { useFollowRequestsAlert } from "@/features/social/hooks/use-follow-requests-alert";

/** Fontes de alerta do menu inferior que vêm do módulo social; não desenha nada (o menu mostra a bolinha). */
export function SocialNavAlerts() {
  useFollowRequestsAlert();
  return null;
}
