"use client";

import { useMemo } from "react";
import { storyFileName } from "@guf/core";
import type { ToastOptions } from "@/features/app-shell";
import { useShareStory } from "@/features/share/api/use-share-story";
import { availableStoryModels, STORY_STYLES } from "@/features/share/constants/story-catalog";
import { ShareImagesSheet } from "./share-images-sheet";

/** Aviso depois de baixar a imagem (a tela que abriu a folha mostra). */
export const STORY_SAVED_TOAST: [string, ToastOptions] = [
  "Imagem salva",
  { tone: "success", message: "Está nos downloads do aparelho, pronta para o Instagram." },
];

export interface ShareStorySheetProps {
  open: boolean;
  /** Treino concluído (precisa estar no servidor). */
  sessionId: string | null;
  onClose: () => void;
  /** Só desenvolvimento: usa o mock (?estado=). */
  mockScenario?: string | null;
  /** Imagem baixada (a tela mostra o aviso). */
  onSaved?: () => void;
}

/** "Compartilhar nos Stories" de um treino concluído: os modelos que valem para ele. */
export function ShareStorySheet({ open, sessionId, onClose, mockScenario, onSaved }: ShareStorySheetProps) {
  const story = useShareStory(sessionId, open, mockScenario);
  const models = useMemo(() => (story.data ? availableStoryModels(story.data) : []), [story.data]);
  const performedOn = story.data?.performedOn ?? "";

  return (
    <ShareImagesSheet
      open={open}
      onClose={onClose}
      title="Compartilhar nos Stories"
      data={story.data}
      models={models}
      styles={STORY_STYLES}
      fileName={(modelId) => storyFileName(modelId, performedOn)}
      error={story.error}
      onRetry={() => void story.refetch()}
      onSaved={onSaved}
    />
  );
}
