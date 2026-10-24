import { Dumbbell, Flame, HeartPulse, Leaf, Zap, type LucideIcon } from "lucide-react";
import type { TrainingGoal } from "@guf/core";

/** Ícone de cada objetivo (protótipo "Editar Perfil"). */
export const TRAINING_GOAL_ICONS: Record<TrainingGoal, LucideIcon> = {
  hypertrophy: Dumbbell,
  strength: Zap,
  weight_loss: Flame,
  conditioning: HeartPulse,
  health: Leaf,
};
