import { plural } from "./format";

/** Regras e textos de "Editar perfil" (bio, objetivos e experiência; puras, sem React). */

/** Limite da bio (o banco confere o mesmo: profiles_bio_length). */
export const BIO_MAX_LENGTH = 150;
/** A partir daqui o contador da bio avisa que está acabando. */
export const BIO_WARNING_LENGTH = 140;

/** Objetivos de treino, na ordem da tela (o banco aceita só estes: profiles_training_goals_known). */
export const TRAINING_GOALS = ["hypertrophy", "strength", "weight_loss", "conditioning", "health"] as const;
export type TrainingGoal = (typeof TRAINING_GOALS)[number];

export const TRAINING_GOAL_LABELS: Record<TrainingGoal, string> = {
  hypertrophy: "Hipertrofia",
  strength: "Força",
  weight_loss: "Emagrecimento",
  conditioning: "Condicionamento",
  health: "Saúde",
};

/** Experiência de treino (profiles_experience_level_known). */
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

/** Objetivos vindos do banco, sem valores desconhecidos e na ordem do catálogo. */
export function toTrainingGoals(values: readonly string[] | null | undefined): TrainingGoal[] {
  const known = new Set(values ?? []);
  return TRAINING_GOALS.filter((goal) => known.has(goal));
}

export function toExperienceLevel(value: string | null | undefined): ExperienceLevel | null {
  return EXPERIENCE_LEVELS.find((level) => level === value) ?? null;
}

/** Bio digitada → o que vai para o banco (vazia = null). */
export function toStoredBio(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}

/** "Salvar 1 alteração" · "Salvar 3 alterações". */
export function saveChangesLabel(changes: number): string {
  return `Salvar ${plural(changes, "alteração", "alterações")}`;
}

/** Aviso ao sair sem salvar. */
export function unsavedChangesMessage(changes: number): string {
  return changes === 1 ? "1 alteração não foi salva e será perdida." : `${changes} alterações não foram salvas e serão perdidas.`;
}
