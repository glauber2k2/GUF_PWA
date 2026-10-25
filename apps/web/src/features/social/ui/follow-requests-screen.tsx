"use client";

import { useState } from "react";
import { CheckCheck, ChevronLeft, UserCheck, X } from "lucide-react";
import { formatHandle, requestedAgoLabel } from "@guf/core";
import type { ApiError, Connection } from "@guf/api";
import { Avatar, Banner, Button, EmptyState, IconButton, Skeleton } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useCanUseSocial, useConnections, useRespondFollowRequest } from "@/features/social/api/use-social";

function RequestRow({ person, disabled, onRespond }: { person: Connection; disabled: boolean; onRespond: (accept: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 pr-3 pl-4 last:border-b-0">
      <Avatar src={person.avatarUrl} name={person.name ?? person.handle} size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <strong className="truncate text-[15px] leading-5">{person.name ?? formatHandle(person.handle)}</strong>
        <span className="truncate text-[13px] leading-[18px] text-fg-secondary">
          {formatHandle(person.handle)} · {requestedAgoLabel(person.since, new Date())}
        </span>
      </span>
      <Button variant="primary" size="md" disabled={disabled} onClick={() => onRespond(true)}>
        Aceitar
      </Button>
      <IconButton icon={X} label={`Recusar ${formatHandle(person.handle)}`} variant="secondary" disabled={disabled} onClick={() => onRespond(false)} />
    </div>
  );
}

/** Solicitações para seguir (protótipo "Perfil Social"): aceitar, recusar ou aceitar todas. */
export function FollowRequestsScreen() {
  const requests = useConnections("requests", null);
  const respond = useRespondFollowRequest();
  const canUse = useCanUseSocial();
  const goBack = useGoBack("/perfil");
  const { showToast } = useAppShell();
  const [acceptingAll, setAcceptingAll] = useState(false);
  const disabled = !canUse || respond.isPending || acceptingAll;
  const people = requests.data ?? [];

  const onError = (error: ApiError) => showToast(error.message, { tone: "error" });
  const respondTo = (userId: string, accept: boolean) =>
    respond.mutate({ userId, accept }, { onSuccess: () => accept && showToast("Pedido aceito", { tone: "success" }), onError });

  // Um por vez: cada aceite é uma gravação própria no banco; se uma falhar, as seguintes não vão.
  const acceptAll = async () => {
    setAcceptingAll(true);
    try {
      for (const person of people) await respond.mutateAsync({ userId: person.userId, accept: true });
      showToast("Pedidos aceitos", { tone: "success" });
    } catch (error) {
      onError(error as ApiError);
    } finally {
      setAcceptingAll(false);
    }
  };

  return (
    <main className="flex flex-col gap-4 px-4">
      <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar para o perfil" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 flex-1 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">Solicitações para seguir</h1>
      </div>
      <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">Seu perfil é privado. Quem você aceitar passa a ver sua evolução e sequência.</p>

      {!canUse && (
        <Banner tone="warning" title="Sem conexão">
          para responder aos pedidos, conecte-se à internet.
        </Banner>
      )}

      {requests.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void requests.refetch()}>
          {requests.error.message}
        </Banner>
      ) : requests.isPending ? (
        <Skeleton className="h-[204px] w-full rounded-lg" />
      ) : people.length === 0 ? (
        <EmptyState icon={UserCheck} title="Tudo em dia" message="Nenhuma solicitação pendente. Novos pedidos aparecem no topo do seu perfil." bordered />
      ) : (
        <>
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
            {people.map((person) => (
              <RequestRow key={person.userId} person={person} disabled={disabled} onRespond={(accept) => respondTo(person.userId, accept)} />
            ))}
          </div>
          <Button variant="secondary" size="tall" icon={CheckCheck} fullWidth loading={acceptingAll} disabled={disabled} onClick={() => void acceptAll()}>
            Aceitar todas
          </Button>
        </>
      )}
    </main>
  );
}
