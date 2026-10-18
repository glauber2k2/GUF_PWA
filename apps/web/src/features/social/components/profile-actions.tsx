"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ChevronDown, Clock, Link2, Pencil, Share2, Swords, UserCheck, UserMinus, UserPlus, UserX } from "lucide-react";
import { FOLLOW_BUTTON_LABELS, followButtonState, socialInvitePath } from "@guf/core";
import type { MemberProfile } from "@guf/api";
import { BottomSheet, Button, ConfirmDialog, IconButton, SheetOption } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useBlockUser, useCanUseSocial, useRemoveFollower, useRequestFollow, useUnfollow } from "@/features/social/api/use-social";

/** Link completo do perfil (convite). */
export function profileInviteUrl(handle: string): string {
  return `${window.location.origin}${socialInvitePath(handle)}`;
}

/** Compartilha o link do perfil (Web Share) ou copia; cancelar não é erro. */
export async function shareProfileLink(handle: string, showToast: ReturnType<typeof useAppShell>["showToast"]) {
  const url = profileInviteUrl(handle);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Meu perfil no guf", text: `Me segue no guf: @${handle}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast("Link copiado", { tone: "success", message: "Envie para quem você quer que siga você." });
  } catch (e) {
    if ((e as Error).name !== "AbortError") showToast("Não foi possível compartilhar", { tone: "error", message: "Copie o link e tente de novo." });
  }
}

/** Seu perfil: editar e compartilhar o link. */
export function SelfActions({ handle, onEdit }: { handle: string; onEdit: () => void }) {
  const { showToast } = useAppShell();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="tall" icon={Pencil} fullWidth onClick={onEdit} className="flex-1">
        Editar perfil
      </Button>
      <Button variant="secondary" size="tall" icon={Share2} fullWidth onClick={() => void shareProfileLink(handle, showToast)} className="flex-1">
        Compartilhar
      </Button>
    </div>
  );
}

/** Perfil de outra pessoa: seguir/solicitar, menu de quem já segue e duelo. */
export function VisitorActions({ profile }: { profile: MemberProfile }) {
  const router = useRouter();
  const { showToast } = useAppShell();
  const canUse = useCanUseSocial();
  const follow = useRequestFollow();
  const unfollow = useUnfollow();
  const [menuOpen, setMenuOpen] = useState(false);
  const state = followButtonState(profile.relationship, profile.followsYou, profile.visibility);
  const first = profile.name?.split(" ")[0] ?? `@${profile.handle}`;

  const onFollow = () =>
    follow.mutate(profile.userId, {
      onSuccess: (status) =>
        showToast(status === "accepted" ? `Seguindo ${first}` : "Solicitação enviada", {
          tone: "success",
          message: status === "accepted" ? undefined : `Quando ${first} aprovar, você verá a evolução e a sequência.`,
        }),
      onError: (error) => showToast(error.message, { tone: "error" }),
    });

  const onUnfollow = () => {
    setMenuOpen(false);
    unfollow.mutate(profile.userId, {
      onSuccess: () => showToast(state === "requested" ? "Solicitação cancelada" : `Você deixou de seguir ${first}`, { tone: "info" }),
      onError: (error) => showToast(error.message, { tone: "error" }),
    });
  };

  const onDuel = () =>
    profile.isCompetitor
      ? router.push(`/competicao?rival=${encodeURIComponent(profile.userId)}`)
      : showToast("Vocês ainda não competem", { tone: "info", message: "A competição começa quando vocês se seguem mutuamente." });

  const following = state === "following" || state === "requested";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {following ? (
          <Button
            variant="secondary"
            size="tall"
            icon={state === "requested" ? Clock : UserCheck}
            iconRight={ChevronDown}
            fullWidth
            disabled={!canUse}
            onClick={() => setMenuOpen(true)}
            className="flex-1"
          >
            {FOLLOW_BUTTON_LABELS[state]}
          </Button>
        ) : (
          <Button variant="primary" size="tall" icon={UserPlus} fullWidth disabled={!canUse} loading={follow.isPending} onClick={onFollow} className="flex-1">
            {state === "self" ? "" : FOLLOW_BUTTON_LABELS[state]}
          </Button>
        )}
        <IconButton icon={Swords} label="Desafiar para duelo" variant="secondary" size="md" onClick={onDuel} className="size-12" />
      </div>
      {profile.followsYou && <span className="-mt-0.5 self-start text-xs leading-4 whitespace-nowrap text-fg-muted">Segue você</span>}

      <BottomSheet placement="screen" open={menuOpen} onClose={() => setMenuOpen(false)} title={`@${profile.handle}`}>
        <SheetOption icon={UserMinus} title={state === "requested" ? "Cancelar solicitação" : "Deixar de seguir"} onClick={onUnfollow} />
      </BottomSheet>
    </div>
  );
}

/** Menu de três pontos no perfil de outra pessoa: copiar link, remover seguidor e bloquear. */
export function VisitorOptionsSheet({ profile, open, onClose }: { profile: MemberProfile; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useAppShell();
  const block = useBlockUser();
  const remove = useRemoveFollower();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const first = profile.name?.split(" ")[0] ?? `@${profile.handle}`;

  const copyLink = async () => {
    onClose();
    try {
      await navigator.clipboard.writeText(profileInviteUrl(profile.handle));
      showToast("Link copiado", { tone: "success" });
    } catch {
      showToast("Não foi possível copiar o link", { tone: "error" });
    }
  };

  return (
    <>
      <BottomSheet placement="screen" open={open} onClose={onClose} title={`@${profile.handle}`}>
        <SheetOption icon={Link2} title="Copiar link do perfil" onClick={() => void copyLink()} />
        {profile.followsYou && (
          <SheetOption
            icon={UserX}
            title="Remover seguidor"
            subtitle={`${first} deixa de ver o que só seguidores veem`}
            onClick={() => {
              onClose();
              remove.mutate(profile.userId, {
                onSuccess: () => showToast("Seguidor removido", { tone: "info" }),
                onError: (error) => showToast(error.message, { tone: "error" }),
              });
            }}
          />
        )}
        <SheetOption
          icon={Ban}
          title="Bloquear"
          subtitle="Desfaz os vínculos e vocês deixam de se encontrar"
          onClick={() => {
            onClose();
            setConfirmBlock(true);
          }}
        />
      </BottomSheet>
      <ConfirmDialog
        placement="screen"
        open={confirmBlock}
        title={`Bloquear @${profile.handle}?`}
        message={`${first} deixa de seguir você e de ver seu perfil, e você também deixa de ver o perfil de ${first}. Dá para desbloquear em Configurações.`}
        cancelLabel="Cancelar"
        confirmLabel="Bloquear"
        destructive
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() => {
          setConfirmBlock(false);
          block.mutate(profile.userId, {
            onSuccess: () => {
              showToast(`@${profile.handle} bloqueado`, { tone: "info" });
              router.back();
            },
            onError: (error) => showToast(error.message, { tone: "error" }),
          });
        }}
      />
    </>
  );
}
