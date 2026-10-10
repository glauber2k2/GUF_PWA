/** Unidade de peso: banco SEMPRE em kg; lb só na exibição (profiles.weight_unit). */
export type WeightUnit = "kg" | "lb";

const KG_PER_LB = 0.45359237;

/** kg do banco → valor exibido na unidade do usuário (1 casa decimal). */
export function toDisplayWeight(kg: number | null, unit: WeightUnit): number | null {
  if (kg === null) return null;
  const value = unit === "lb" ? kg / KG_PER_LB : kg;
  return Math.round(value * 10) / 10;
}

/** Valor digitado na unidade do usuário → kg para gravar (2 casas, como numeric(6,2)). */
export function fromDisplayWeight(value: number | null, unit: WeightUnit): number | null {
  if (value === null) return null;
  const kg = unit === "lb" ? value * KG_PER_LB : value;
  return Math.round(kg * 100) / 100;
}
