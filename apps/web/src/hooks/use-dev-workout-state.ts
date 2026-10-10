"use client";

import { useSearchParams } from "next/navigation";

export type DevWorkoutFlag =
  | "carregando"
  | "erro"
  | "offline"
  | "pausado"
  | "descansando"
  | "timer"
  | "editando"
  | "confirmar";

const FLAGS: DevWorkoutFlag[] = ["carregando", "erro", "offline", "pausado", "descansando", "timer", "editando", "confirmar"];
const NONE: ReadonlySet<DevWorkoutFlag> = new Set();

/**
 * ?estado= na tela de treino para ver os estados do design — SÓ EM DESENVOLVIMENTO.
 * Lista separada por vírgula, ex.: /treino?id=x&estado=descansando,offline.
 * No build de produção a leitura é eliminada (NODE_ENV é constante no build).
 */
export function useDevWorkoutState(): ReadonlySet<DevWorkoutFlag> {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;
  const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase());
  return new Set(FLAGS.filter((f) => values.includes(f)));
}
