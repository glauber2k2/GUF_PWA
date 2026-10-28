"use client";

import { useMemo } from "react";
import { competitionStoryFileName, type CompetitionStory } from "@guf/core";
import { availableCompetitionStoryModels, COMPETITION_STORY_STYLES } from "@/features/share/constants/competition-story-catalog";
import { ShareImagesSheet } from "./share-images-sheet";

export interface ShareCompetitionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sua competição pronta (a tela da competição monta); undefined enquanto carrega. */
  story: CompetitionStory | undefined;
  error: { message: string } | null;
  onRetry: () => void;
  onSaved?: () => void;
}

/** Compartilhar a competição: só os stickers com o seu progresso na temporada. */
export function ShareCompetitionSheet({ open, onClose, story, error, onRetry, onSaved }: ShareCompetitionSheetProps) {
  const models = useMemo(() => (story ? availableCompetitionStoryModels(story) : []), [story]);
  return (
    <ShareImagesSheet
      open={open}
      onClose={onClose}
      title="Compartilhar a competição"
      data={story}
      models={models}
      styles={COMPETITION_STORY_STYLES}
      fileName={(modelId) => competitionStoryFileName(modelId, story?.fileDate ?? "")}
      error={error}
      onRetry={onRetry}
      onSaved={onSaved}
      emptyMessage="Treine nesta temporada para ter imagens da competição."
    />
  );
}
