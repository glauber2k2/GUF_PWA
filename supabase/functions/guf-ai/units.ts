export type WeightUnit = "kg" | "lb";

// Mesma conversão de packages/core/src/units.ts (a Edge Function não importa os pacotes do monorepo).
const KG_PER_LB = 0.45359237;

/** Peso em kg na unidade do usuário, com 1 casa. */
export const toUnit = (kg: number | null, unit: WeightUnit) =>
  kg === null ? null : Math.round((unit === "lb" ? kg / KG_PER_LB : kg) * 10) / 10;
