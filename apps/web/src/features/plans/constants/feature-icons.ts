import { ChartLine, Flag, FolderPlus, ListChecks, Ruler, Sparkles, type LucideIcon } from "lucide-react";
import type { PlanFeature } from "@guf/core";

/** Ícone de cada funcionalidade do catálogo (comparação, oferta e "Incluído no seu plano"). */
export const PLAN_FEATURE_ICONS: Record<PlanFeature, LucideIcon> = {
  custom_projects: FolderPlus,
  routines_per_project: ListChecks,
  guf_ai_daily_messages: Sparkles,
  chart_months: ChartLine,
  measurement_chart_months: Ruler,
  competition_full_history: Flag,
};
