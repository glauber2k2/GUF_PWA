"use client";

import { exercisePath } from "@/features/evolution";
import { WorkoutScreen } from "@/features/workout";

/**
 * Composição do treino com a evolução: a evolução já importa o treino (resumo), então o caminho
 * entra por aqui. Fica no cliente porque a página (com metadata) não pode passar funções.
 */
export function WorkoutRoute() {
  return <WorkoutScreen exercisePathFor={exercisePath} />;
}
