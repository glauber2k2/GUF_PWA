import { CalendarCheck, Trophy, Weight } from "lucide-react";
import type { PointSource } from "@guf/core";
import { Icon, StreakFlame } from "@/shared/components/ds";

/** Aparência de cada origem de pontos (cores pelos tokens; classes fixas para o Tailwind gerar). */
export const POINT_SOURCE_STYLES: Record<PointSource, { bar: string; tint: string; text: string; ring: string }> = {
  constancy: { bar: "bg-accent", tint: "bg-accent/16", text: "text-accent-text", ring: "border-accent-text" },
  streak: { bar: "bg-warning", tint: "bg-warning/16", text: "text-warning", ring: "border-warning" },
  records: { bar: "bg-pr", tint: "bg-pr/16", text: "text-pr-text", ring: "border-pr-text" },
  volume: { bar: "bg-data", tint: "bg-data/16", text: "text-data", ring: "border-data" },
};

/** Ícone da origem (sequência usa a chama do app, nunca outro símbolo). */
export function PointSourceIcon({ source, size = 16 }: { source: PointSource; size?: number }) {
  if (source === "streak") return <StreakFlame size={size} />;
  const icon = source === "constancy" ? CalendarCheck : source === "records" ? Trophy : Weight;
  return <Icon icon={icon} size={size} />;
}

/** Rota do extrato (botão ao lado de "Convidar amigos"). */
export const POINTS_STATEMENT_PATH = "/competicao/extrato";
