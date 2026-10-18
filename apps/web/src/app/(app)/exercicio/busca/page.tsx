import type { Metadata } from "next";
import { ExerciseSearchScreen } from "@/features/evolution";

export const metadata: Metadata = {
  title: "Evolução por exercício · Guf",
};

/** Busca "Ver evolução de um exercício" (aberta pelo Histórico). */
export default function ExerciseSearchPage() {
  return <ExerciseSearchScreen />;
}
