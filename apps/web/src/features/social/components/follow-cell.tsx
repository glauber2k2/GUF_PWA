"use client";

import { FOLLOW_BUTTON_LABELS, followButtonState } from "@guf/core";
import type { PersonSearchResult } from "@guf/api";
import { Button } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useCanUseSocial, useRequestFollow } from "@/features/social/api/use-social";

/** Seguir (ou pedir para seguir) uma pessoa da busca; já seguindo ou pedido enviado vira texto. */
export function FollowCell({ person }: { person: PersonSearchResult }) {
  const { showToast } = useAppShell();
  const canUse = useCanUseSocial();
  const follow = useRequestFollow();
  const state = followButtonState(person.relationship, person.followsYou, person.visibility);
  if (state === "self") return null;
  if (state === "following" || state === "requested") {
    return <span className="text-[13px] font-semibold whitespace-nowrap text-fg-muted">{FOLLOW_BUTTON_LABELS[state]}</span>;
  }
  return (
    <Button
      size="md"
      variant="primary"
      disabled={!canUse}
      loading={follow.isPending}
      onClick={() =>
        follow.mutate(person.userId, {
          onSuccess: (status) => showToast(status === "accepted" ? "Seguindo" : "Solicitação enviada", { tone: "success" }),
          onError: (error) => showToast(error.message, { tone: "error" }),
        })
      }
    >
      {state === "request" ? "Solicitar" : FOLLOW_BUTTON_LABELS[state]}
    </Button>
  );
}
