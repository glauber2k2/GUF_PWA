"use client";

import { useState } from "react";
import { ShieldAlert, Sparkles } from "lucide-react";
import type { PlanImportDraft } from "@guf/api";
import { formatNumber, PLAN_IMPORT_MAX_CHARS } from "@guf/core";
import { planImportTextSchema } from "@guf/schemas";
import { Banner, Button, SavingOverlay, TextAreaField } from "@/shared/components/ds";
import { AiMark } from "@/shared/components/ai-mark";
import { EditorFrame } from "@/shared/components/editor-frame";
import { usePlanGate } from "@/features/plans";
import { OfflineEditBanner, useCanEditPlanning } from "@/features/projects";
import { useConvertTrainingPlan } from "@/features/plan-import/api/use-plan-import";

const PASTE_ROWS = 10;

interface PlanImportPasteStepProps {
  onBack: () => void;
  onConverted: (draft: PlanImportDraft) => void;
}

/** Etapa 1: colar a ficha (ex.: a que o personal mandou no WhatsApp) e converter com o GUF AI. */
export function PlanImportPasteStep({ onBack, onConverted }: PlanImportPasteStepProps) {
  const canEdit = useCanEditPlanning();
  const gate = usePlanGate();
  const convert = useConvertTrainingPlan();
  const [text, setText] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const parsed = planImportTextSchema.safeParse(text);
  const textError = showErrors && !parsed.success ? parsed.error.issues[0]?.message : undefined;
  const convertError = convert.error?.code === "plan_limit" ? null : convert.error;

  const submit = () => {
    if (!parsed.success) return setShowErrors(true);
    convert.mutate(parsed.data, {
      onSuccess: onConverted,
      onError: (error) => void gate.handlePlanError(error, "guf_ai_daily_messages"),
    });
  };

  return (
    <EditorFrame
      title="Importar ficha"
      onBack={onBack}
      bottomBar={
        <Button size="lg" icon={Sparkles} fullWidth sheen disabled={!canEdit} loading={convert.isPending} onClick={submit}>
          Converter com o GUF AI
        </Button>
      }
    >
      {!canEdit && <OfflineEditBanner />}
      <div className="flex flex-col items-start gap-2 pt-1">
        <AiMark size={36} twinkle className="text-accent-text" />
        <h2 className="m-0 text-xl leading-7 font-bold tracking-[-0.01em] text-balance">Cole a ficha do seu treino</h2>
        <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">
          O GUF AI monta o projeto e as rotinas. Exercícios iguais aos do catálogo do guf são usados; os outros viram exercícios seus. Você revisa tudo antes de criar.
        </p>
      </div>
      <TextAreaField
        label="Ficha de treino"
        rows={PASTE_ROWS}
        value={text}
        maxLength={PLAN_IMPORT_MAX_CHARS}
        placeholder={"Treino A – Peito\nSupino reto 4x10\nCrucifixo 3x12…"}
        error={textError}
        hint={`${formatNumber(text.length, 0)} / ${formatNumber(PLAN_IMPORT_MAX_CHARS, 0)}`}
        disabled={convert.isPending}
        onChange={(event) => setText(event.target.value)}
      />
      <Banner tone="info" icon={ShieldAlert}>
        Apague nomes, telefones e dados de saúde antes de colar. Só os exercícios são usados.
      </Banner>
      {convertError && (
        <Banner tone="danger" actionLabel="Tentar" onAction={submit} className="animate-guf-rise-fast">
          {convertError.message}
        </Banner>
      )}
      <SavingOverlay open={convert.isPending} title="Convertendo a ficha" message="O GUF AI está lendo os exercícios." variant={8} />
    </EditorFrame>
  );
}
