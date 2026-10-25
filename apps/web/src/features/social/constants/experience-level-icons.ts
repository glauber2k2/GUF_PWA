import { Medal, Sprout, TrendingUp, type LucideIcon } from "lucide-react";
import type { ExperienceLevel } from "@guf/core";

/** Ícone de cada nível de experiência (selos do perfil, no mesmo padrão dos objetivos). */
export const EXPERIENCE_LEVEL_ICONS: Record<ExperienceLevel, LucideIcon> = {
  beginner: Sprout,
  intermediate: TrendingUp,
  advanced: Medal,
};
