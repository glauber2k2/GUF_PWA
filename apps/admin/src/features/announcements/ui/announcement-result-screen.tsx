"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Ban, CircleCheck, Copy, Info } from "lucide-react";
import type { AdminAnnouncement } from "@guf/api/admin";
import {
  ANNOUNCEMENT_FORMATS,
  ANNOUNCEMENT_FREQUENCIES,
  ANNOUNCEMENT_PURPOSES,
  ANNOUNCEMENT_STATES,
  describeAudience,
  destinationLabel,
  formatCount,
  shareOf,
} from "@guf/core";
import { Banner, Button, cn, Icon, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { useAnnouncement, useDuplicateAnnouncement, useEndAnnouncement } from "@/features/announcements/api/use-announcements-admin";
import { editorPath, FORMAT_ICONS, formatDayTime, formatPeriod, listPath } from "@/features/announcements/helpers/announcement-display";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { Panel } from "@/shared/components/panel";
import { usePlanNames } from "@/shared/hooks/use-plan-options";
import { useToast } from "@/shared/libs/toast-provider";

function Kpi({ label, value, share, note }: { label: string; value: number; share: number; note: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-5">
      <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">{label}</span>
      <span className="font-display text-5xl leading-none font-bold tabular-nums">{formatCount(value)}</span>
      <span role="img" aria-label={note} className="h-2 overflow-hidden rounded-pill bg-surface-3">
        {/* Largura dinâmica: a parte do alcance. */}
        <span className="block h-full rounded-pill bg-data" style={{ width: `${share}%` }} />
      </span>
      <span className="text-[13px] text-fg-secondary">{note}</span>
    </div>
  );
}

/** 9 · Resultado: números com barras (pessoas, não vezes), detalhes e Encerrar/Duplicar. */
export function AnnouncementResultScreen() {
  const id = useSearchParams().get("id");
  const announcement = useAnnouncement(id);
  const router = useRouter();

  if (announcement.isPending) {
    return (
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-36" />
      </div>
    );
  }
  if (announcement.isError) {
    return (
      <div className="mx-auto max-w-[680px] p-6">
        <Banner tone="danger" title="Não foi possível abrir o comunicado." actionLabel="Voltar" onAction={() => router.push(listPath())}>
          {announcement.error.message}
        </Banner>
      </div>
    );
  }
  return <Result announcement={announcement.data} />;
}

function Result({ announcement }: { announcement: AdminAnnouncement }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useStaff();
  const planNames = usePlanNames();
  const end = useEndAnnouncement();
  const duplicate = useDuplicateAnnouncement();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { draft } = announcement;
  const reach = announcement.reachEstimate ?? 0;
  const canEnd = can("publish_announcements") && (announcement.state === "active" || announcement.state === "scheduled");
  const canDuplicate = can("draft_announcements");

  const duplicateNow = () =>
    duplicate.mutate(announcement.id, {
      onSuccess: (newId) => {
        toast("Cópia criada como rascunho", { tone: "success" });
        router.push(editorPath(newId));
      },
      onError: (error) => toast("Não foi possível duplicar", { tone: "error", message: error.message }),
    });
  const endNow = () =>
    end.mutate(announcement.id, {
      onSuccess: () => {
        setConfirmEnd(false);
        toast("Comunicado encerrado. Os números ficam salvos.", { tone: "success" });
      },
    });

  const kpis = [
    { label: "Alcance", value: reach, share: 100, note: "pessoas no público" },
    { label: "Vistos", value: announcement.seenCount, share: shareOf(announcement.seenCount, reach), note: `${shareOf(announcement.seenCount, reach)}% do alcance` },
    { label: "Fechados", value: announcement.dismissedCount, share: shareOf(announcement.dismissedCount, reach), note: `${shareOf(announcement.dismissedCount, reach)}% do alcance` },
    { label: "Cliques no botão", value: announcement.ctaCount, share: shareOf(announcement.ctaCount, reach), note: `${shareOf(announcement.ctaCount, reach)}% do alcance` },
  ];

  const actions = (
    <>
      {canDuplicate && (
        <Button variant="secondary" icon={Copy} loading={duplicate.isPending} onClick={duplicateNow} className="flex-1 md:flex-none">
          Duplicar
        </Button>
      )}
      {canEnd && (
        <Button variant="danger" icon={Ban} onClick={() => setConfirmEnd(true)} className="flex-1 md:flex-none">
          Encerrar agora
        </Button>
      )}
    </>
  );

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 p-4 pb-28 md:p-10">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push(listPath())} className="-ml-3 hidden self-start md:inline-flex">
          Comunicados
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="m-0 text-[clamp(22px,2.4vw,30px)] leading-tight font-bold tracking-[-0.02em] text-pretty">{draft.title}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-fg-secondary">
              <span
                className={cn(
                  "inline-flex h-6.5 items-center gap-1.5 rounded-pill px-2.5 font-semibold",
                  announcement.state === "active" ? "bg-success/14 text-success" : "bg-surface-3 text-fg-secondary",
                )}
              >
                <Icon icon={CircleCheck} size={13} />
                {ANNOUNCEMENT_STATES[announcement.state].label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={FORMAT_ICONS[draft.format]} size={14} />
                {ANNOUNCEMENT_FORMATS[draft.format].label}
              </span>
              <span>{describeAudience(draft.audience, { planNames, targetCount: announcement.targetIds.length })}</span>
              <span>{formatPeriod(draft.startsAt, draft.endsAt)}</span>
            </div>
          </div>
          <div className="hidden gap-2.5 md:flex">{actions}</div>
        </div>
      </div>

      {end.error && <Banner tone="danger">{end.error.message}</Banner>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
        {kpis.map((kpi) => (
          <Kpi key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3">
        <Panel as="dl">
          {[
            { label: "Botão", value: draft.ctaLabel ? `${draft.ctaLabel} → ${destinationLabel(draft.ctaPath)}` : "Sem botão" },
            { label: "Frequência", value: ANNOUNCEMENT_FREQUENCIES[draft.frequency].label },
            { label: "Finalidade", value: ANNOUNCEMENT_PURPOSES[draft.purpose].label },
            {
              label: "Publicado por",
              value: announcement.publishedAt ? `${announcement.publishedByName ?? "Equipe"} · ${formatDayTime(announcement.publishedAt)}` : "—",
            },
          ].map((row) => (
            <div key={row.label} className="flex gap-3 px-4 py-3">
              <dt className="flex-1 text-fg-secondary">{row.label}</dt>
              <dd className="m-0 text-right">{row.value}</dd>
            </div>
          ))}
        </Panel>
        <div className="flex items-start gap-2.5 self-start rounded-lg bg-surface-3 px-4 py-3.5 text-[13px] text-fg-secondary">
          <Icon icon={Info} size={16} className="mt-px flex-none" />
          Os números contam pessoas, não vezes. Quem viu duas vezes conta uma. Sem lista de quem viu (só os totais).
        </div>
      </div>

      {(canDuplicate || canEnd) && <MobileActionBar>{actions}</MobileActionBar>}

      {confirmEnd && (
        <Dialog open title="Encerrar agora?" onClose={() => setConfirmEnd(false)}>
          <p className="m-0 text-pretty text-fg-secondary">
            O comunicado some do app para as {formatCount(reach)} pessoas do público. Os números ficam salvos. Não dá para reativar; para mostrar de novo,
            duplique.
          </p>
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth onClick={() => setConfirmEnd(false)}>
              Manter ativo
            </Button>
            <Button variant="danger" size="tall" fullWidth loading={end.isPending} onClick={endNow}>
              Encerrar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
