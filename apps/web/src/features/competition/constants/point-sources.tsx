import type { PointSource } from "@guf/core";

/** Aparência de cada origem de pontos (cores pelos tokens; classes fixas para o Tailwind gerar). */
export const POINT_SOURCE_STYLES: Record<PointSource, { bar: string; tint: string; text: string; ring: string }> = {
  constancy: { bar: "bg-accent", tint: "bg-accent/16", text: "text-accent-text", ring: "border-accent-text" },
  streak: { bar: "bg-warning", tint: "bg-warning/16", text: "text-warning", ring: "border-warning" },
  records: { bar: "bg-pr", tint: "bg-pr/16", text: "text-pr-text", ring: "border-pr-text" },
  volume: { bar: "bg-data", tint: "bg-data/16", text: "text-data", ring: "border-data" },
};

/** Rota do extrato (botão ao lado de "Convidar amigos"). */
export const POINTS_STATEMENT_PATH = "/competicao/extrato";
