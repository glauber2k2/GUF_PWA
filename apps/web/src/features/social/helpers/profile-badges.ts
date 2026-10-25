import type { LucideIcon } from "lucide-react";
import { EXPERIENCE_LEVEL_LABELS, TRAINING_GOAL_LABELS, type ExperienceLevel, type TrainingGoal } from "@guf/core";
import { EXPERIENCE_LEVEL_ICONS } from "@/features/social/constants/experience-level-icons";
import { TRAINING_GOAL_ICONS } from "@/features/social/constants/training-goal-icons";

/** Selo do perfil: todo selo tem rótulo e ícone (mesmo desenho para nível e objetivos). */
export interface ProfileBadge {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface ProfileBadgeSource {
  experienceLevel: ExperienceLevel | null;
  trainingGoals: readonly TrainingGoal[];
}

/**
 * Selos do perfil na ordem de exibição: nível de experiência e depois os objetivos.
 * Tipo de selo novo = mais uma fonte aqui, sem mexer em quem desenha.
 */
export function buildProfileBadges({ experienceLevel, trainingGoals }: ProfileBadgeSource): ProfileBadge[] {
  const level: ProfileBadge[] = experienceLevel
    ? [{ key: `level-${experienceLevel}`, label: EXPERIENCE_LEVEL_LABELS[experienceLevel], icon: EXPERIENCE_LEVEL_ICONS[experienceLevel] }]
    : [];
  const goals = trainingGoals.map((goal) => ({ key: `goal-${goal}`, label: TRAINING_GOAL_LABELS[goal], icon: TRAINING_GOAL_ICONS[goal] }));
  return [...level, ...goals];
}
