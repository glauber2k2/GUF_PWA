"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Users, X } from "lucide-react";
import type { ApiError, ConnectionKind } from "@guf/api";
import { Banner, Button, EmptyState, IconButton, SegmentedControl, Skeleton } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useGoBack } from "@/shared/hooks/use-go-back";
import {
  useCanUseSocial,
  useConnections,
  usePersonByHandle,
  useRespondFollowRequest,
  useUnblockUser,
} from "@/features/social/api/use-social";
import { useSharingConsentGate } from "@/features/social/hooks/use-sharing-consent-gate";
import { PersonRow } from "@/features/social/components/person-row";
import { SharingConsentSheet } from "@/features/social/components/sharing-consent-sheet";

const TABS: Record<string, { kind: ConnectionKind; label: string; empty: string }> = {
  seguidores: { kind: "followers", label: "Seguidores", empty: "Ninguém segue este perfil ainda." },
  seguindo: { kind: "following", label: "Seguindo", empty: "Ninguém por aqui ainda." },
  pedidos: { kind: "requests", label: "Pedidos", empty: "Nenhum pedido para seguir você." },
  bloqueados: { kind: "blocked", label: "Bloqueados", empty: "Você não bloqueou ninguém." },
};

const OWN_TABS = ["seguidores", "seguindo", "pedidos"];
const OTHER_TABS = ["seguidores", "seguindo"];

/**
 * Seguidores, seguindo e pedidos (/seguidores?aba=…&u=@handle). Aceitar o primeiro pedido pede o
 * consentimento de compartilhamento. Tela provisória (sem protótipo): lista simples.
 */
export function ConnectionsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const handle = params.get("u");
  const tabKey = params.get("aba") ?? "seguidores";
  const owner = usePersonByHandle(handle);
  const ownerId = handle ? (owner.data ?? null) : null;
  const tabs = handle ? OTHER_TABS : [...OWN_TABS, ...(tabKey === "bloqueados" ? ["bloqueados"] : [])];
  const tab = TABS[tabs.includes(tabKey) ? tabKey : "seguidores"] ?? TABS.seguidores!;
  const list = useConnections(tab.kind, ownerId);
  const goBack = useGoBack("/perfil");
  const { showToast } = useAppShell();
  const canUse = useCanUseSocial();
  const respond = useRespondFollowRequest();
  const unblock = useUnblockUser();
  const onError = useCallback((error: ApiError) => showToast(error.message, { tone: "error" }), [showToast]);
  const consent = useSharingConsentGate(onError);

  const setTab = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("aba", key);
    router.replace(`/seguidores?${next.toString()}`);
  };

  const accept = (userId: string) =>
    consent.run(async () => {
      await respond.mutateAsync({ userId, accept: true });
      showToast("Pedido aceito", { tone: "success" });
    });

  return (
    <main className="flex flex-col gap-4 px-4">
      <div className="sticky top-0 z-[5] -mx-4 flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">{handle ? `@${handle}` : "Seguidores"}</h1>
      </div>

      <SegmentedControl options={tabs.map((key) => ({ value: key, label: TABS[key]?.label ?? key }))} value={tabKey} onChange={setTab} label="Lista" />

      {list.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void list.refetch()}>
          {list.error.message}
        </Banner>
      ) : list.isPending || (handle && owner.isPending) ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : list.data.length === 0 ? (
        <EmptyState icon={Users} title={tab.label} message={tab.empty} />
      ) : (
        <div className="flex flex-col gap-2">
          {list.data.map((person) => (
            <PersonRow key={person.userId} person={person} subtitle={person.isMutual ? "vocês competem" : undefined}>
              {tab.kind === "requests" && (
                <div className="flex gap-1.5">
                  <IconButton
                    icon={X}
                    label="Recusar"
                    variant="secondary"
                    disabled={!canUse}
                    onClick={() => respond.mutate({ userId: person.userId, accept: false }, { onError })}
                  />
                  <IconButton icon={Check} label="Aceitar" variant="primary" disabled={!canUse} onClick={() => void accept(person.userId)} />
                </div>
              )}
              {tab.kind === "blocked" && (
                <Button
                  variant="secondary"
                  size="md"
                  disabled={!canUse}
                  onClick={() => unblock.mutate(person.userId, { onSuccess: () => showToast("Desbloqueado", { tone: "info" }), onError })}
                >
                  Desbloquear
                </Button>
              )}
            </PersonRow>
          ))}
        </div>
      )}
      <SharingConsentSheet {...consent.sheet} />
    </main>
  );
}
