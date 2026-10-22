"use client";

import { useState } from "react";
import type { AdminAnnouncement, AnnouncementDraft } from "@guf/api/admin";
import { parseTargetIds, type Audience } from "@guf/core";
import { announcementDraftSchema, announcementPublishSchema } from "@guf/schemas";
import { usePublishAnnouncement, useSaveAnnouncement } from "@/features/announcements/api/use-announcements-admin";
import { draftFromState, initialEditorState, withAudience, type EditorState, type EditorStep } from "@/features/announcements/helpers/editor-state";

/** Primeiro problema que impede publicar, com o passo onde corrigir. */
export interface EditorIssue {
  step: EditorStep;
  message: string;
}

const STEP_OF_FIELD: Record<string, EditorStep> = {
  title: 1,
  body: 1,
  ctaLabel: 1,
  ctaPath: 1,
  audience: 2,
  purpose: 4,
  startsAt: 3,
  endsAt: 3,
};

function firstIssue(draft: AnnouncementDraft, targetCount: number, forPublish: boolean): EditorIssue | null {
  const parsed = announcementDraftSchema.safeParse(draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { step: STEP_OF_FIELD[String(issue?.path[0])] ?? 1, message: issue?.message ?? "Confira os campos." };
  }
  if (draft.ctaLabel && !draft.ctaPath) return { step: 1, message: "Escolha a tela que o botão abre." };
  if (draft.audience.rules.some((r) => r.type === "ids") && targetCount === 0) return { step: 2, message: "Cole pelo menos um id na lista." };
  if (!forPublish) return null;
  const ready = announcementPublishSchema.safeParse({ title: draft.title, body: draft.body, endsAt: draft.endsAt ?? "" });
  if (!ready.success) {
    const issue = ready.error.issues[0];
    return { step: STEP_OF_FIELD[String(issue?.path[0])] ?? 1, message: issue?.message ?? "Confira os campos." };
  }
  if (draft.endsAt && draft.endsAt <= new Date().toISOString()) return { step: 3, message: "O fim precisa ser no futuro." };
  return null;
}

/**
 * Estado do editor de comunicado (protótipo 8a–8n): 4 passos, rascunho salvo no banco e publicar
 * (só admin). Público e finalidade andam juntos: com consentimento de saúde, "Produto" sai.
 */
export function useAnnouncementEditor(existing: AdminAnnouncement | undefined) {
  const [id, setId] = useState<string | null>(existing?.id ?? null);
  const [state, setState] = useState<EditorState>(() => initialEditorState(existing));
  const [step, setStep] = useState<EditorStep>(1);
  const [isDirty, setDirty] = useState(false);
  const save = useSaveAnnouncement();
  const publish = usePublishAnnouncement();

  const targets = parseTargetIds(state.idsText);
  const draft = draftFromState(state);
  const update = (patch: Partial<EditorState>) => {
    setState((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const updateDraft = (patch: Partial<AnnouncementDraft>) => {
    setState((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
    setDirty(true);
  };
  const setAudience = (audience: Audience) => {
    setState((s) => ({ ...s, draft: withAudience(s.draft, audience) }));
    setDirty(true);
  };

  /** Grava o rascunho; devolve o id e quantos ids da lista foram ignorados (null se falhou). */
  const saveDraft = async (): Promise<{ id: string; ignoredIds: number } | null> => {
    const issue = firstIssue(draft, targets.ids.length, false);
    if (issue) {
      setStep(issue.step);
      return null;
    }
    try {
      const result = await save.mutateAsync({ id, draft, targetIds: targets.ids });
      setId(result.id);
      setDirty(false);
      return { id: result.id, ignoredIds: result.targetsIgnored + targets.invalidCount };
    } catch {
      return null;
    }
  };

  const publishIssue = firstIssue(draft, targets.ids.length, true);

  /** Salva o que mudou e publica (ou agenda). O banco confere tudo de novo. */
  const saveAndPublish = async (): Promise<boolean> => {
    if (publishIssue) {
      setStep(publishIssue.step);
      return false;
    }
    const savedId = isDirty || !id ? (await saveDraft())?.id : id;
    if (!savedId) return false;
    try {
      await publish.mutateAsync(savedId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    id,
    state,
    draft,
    step,
    setStep,
    update,
    updateDraft,
    setAudience,
    targets,
    isDirty,
    saveDraft,
    saveAndPublish,
    publishIssue,
    isSaving: save.isPending,
    isPublishing: publish.isPending,
    error: save.error ?? publish.error,
  };
}

export type AnnouncementEditor = ReturnType<typeof useAnnouncementEditor>;
