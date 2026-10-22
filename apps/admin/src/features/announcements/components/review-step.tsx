"use client";

import type { AnnouncementDraft } from "@guf/api/admin";
import {
  ANNOUNCEMENT_FORMATS,
  ANNOUNCEMENT_FREQUENCIES,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_PURPOSES,
  ANNOUNCEMENT_TONES,
  describeAudience,
  destinationLabel,
  formatCount,
  isPurposeAllowed,
  priorityFromValue,
  type AnnouncementPurpose,
} from "@guf/core";
import { Banner, Button } from "@guf/ui";
import { formatDayTime } from "@/features/announcements/helpers/announcement-display";
import type { EditorStep } from "@/features/announcements/helpers/editor-state";
import type { EditorIssue } from "@/features/announcements/hooks/use-announcement-editor";
import { ChoiceCard } from "@/shared/components/choice-card";
import { Panel } from "@/shared/components/panel";

interface ReviewStepProps {
  draft: AnnouncementDraft;
  reach: number | undefined;
  targetCount: number;
  planNames: Record<string, string>;
  issue: EditorIssue | null;
  onPurpose: (purpose: AnnouncementPurpose) => void;
  onGoTo: (step: EditorStep) => void;
}

/** 8f · d) Revisar: resumo com "Editar" por passo e a finalidade (base legal do comunicado). */
export function ReviewStep({ draft, reach, targetCount, planNames, issue, onPurpose, onGoTo }: ReviewStepProps) {
  const when = `${draft.startsAt ? formatDayTime(draft.startsAt) : "Ao publicar"} – ${draft.endsAt ? formatDayTime(draft.endsAt) : "sem fim"} (Brasília)`;
  const rows: Array<{ label: string; value: string; step: EditorStep }> = [
    { label: "Formato e tom", value: `${ANNOUNCEMENT_FORMATS[draft.format].label} · ${ANNOUNCEMENT_TONES[draft.tone].label}`, step: 1 },
    {
      label: "Conteúdo",
      value: `${draft.title || "Sem título"}${draft.ctaLabel ? ` · botão “${draft.ctaLabel}” → ${destinationLabel(draft.ctaPath)}` : ""}`,
      step: 1,
    },
    {
      label: "Público",
      value: `${describeAudience(draft.audience, { planNames, targetCount })} · cerca de ${reach === undefined ? "…" : formatCount(reach)} pessoas`,
      step: 2,
    },
    {
      label: "Quando",
      value: `${when} · ${ANNOUNCEMENT_FREQUENCIES[draft.frequency].label} · prioridade ${ANNOUNCEMENT_PRIORITIES[priorityFromValue(draft.priority)].label.toLowerCase()}`,
      step: 3,
    },
  ];

  return (
    <>
      {issue && (
        <Banner tone="warning" title="Falta corrigir antes de publicar." actionLabel="Corrigir" onAction={() => onGoTo(issue.step)}>
          {issue.message}
        </Banner>
      )}
      <Panel as="dl">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3 py-3 pr-2 pl-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <dt className="text-xs font-semibold tracking-[.08em] text-fg-muted uppercase">{row.label}</dt>
              <dd className="m-0 text-pretty">{row.value}</dd>
            </div>
            <Button variant="ghost" onClick={() => onGoTo(row.step)}>
              Editar
            </Button>
          </div>
        ))}
      </Panel>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[13px] font-semibold text-fg-secondary">Finalidade</legend>
        <div role="radiogroup" className="flex flex-col gap-2">
          {(Object.keys(ANNOUNCEMENT_PURPOSES) as AnnouncementPurpose[]).map((purpose) => (
            <ChoiceCard
              key={purpose}
              selected={draft.purpose === purpose}
              onSelect={() => onPurpose(purpose)}
              title={ANNOUNCEMENT_PURPOSES[purpose].label}
              description={ANNOUNCEMENT_PURPOSES[purpose].description}
              disabledReason={isPurposeAllowed(draft.audience, purpose) ? undefined : "Indisponível com a regra de consentimento de saúde."}
            />
          ))}
        </div>
      </fieldset>
    </>
  );
}
