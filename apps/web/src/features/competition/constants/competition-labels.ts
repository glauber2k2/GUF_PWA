import { CalendarDays, CalendarRange, Calendar, Dumbbell, Medal, Weight, Zap, type LucideIcon } from "lucide-react";
import type { CompetitionMetric, CompetitionPeriod } from "@guf/core";

export const METRICS: Record<CompetitionMetric, { label: string; unit: string; subtitle: string; icon: LucideIcon; accumulated: string }> = {
  points: { label: "Pontos", unit: "pts", subtitle: "Constância, sequência, recordes e volume", icon: Zap, accumulated: "Pontos acumulados" },
  volume: { label: "Volume", unit: "kg", subtitle: "Carga × repetições", icon: Weight, accumulated: "Volume acumulado" },
  workouts: { label: "Treinos", unit: "treinos", subtitle: "Treinos concluídos", icon: Dumbbell, accumulated: "Treinos acumulados" },
  records: { label: "Recordes", unit: "recordes", subtitle: "Recordes de carga batidos", icon: Medal, accumulated: "Recordes acumulados" },
};

export const METRIC_ORDER: CompetitionMetric[] = ["points", "volume", "workouts", "records"];

export const PERIODS: Record<CompetitionPeriod, { short: string; title: string; icon: LucideIcon }> = {
  month: { short: "Este mês", title: "Este mês", icon: Calendar },
  "3m": { short: "3 meses", title: "Últimos 3 meses", icon: CalendarDays },
  "6m": { short: "6 meses", title: "Últimos 6 meses", icon: CalendarDays },
  "1y": { short: "1 ano", title: "Último ano", icon: CalendarDays },
  custom: { short: "Personalizado", title: "Personalizado", icon: CalendarRange },
};

export const PERIOD_ORDER: CompetitionPeriod[] = ["month", "3m", "6m", "1y", "custom"];
