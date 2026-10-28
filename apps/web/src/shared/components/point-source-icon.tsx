import { CalendarCheck, Trophy, Weight } from "lucide-react";
import type { PointSource } from "@guf/core";
import { Icon, StreakFlame } from "@/shared/components/ds";

/** Ícone da origem de pontos da competição (sequência usa a chama do app, nunca outro símbolo). */
export function PointSourceIcon({ source, size = 16 }: { source: PointSource; size?: number }) {
  if (source === "streak") return <StreakFlame size={size} />;
  const icon = source === "constancy" ? CalendarCheck : source === "records" ? Trophy : Weight;
  return <Icon icon={icon} size={size} />;
}
