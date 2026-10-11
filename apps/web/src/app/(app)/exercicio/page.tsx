import type { Metadata } from "next";
import { EvolutionScreen } from "@/components/evolution/evolution-screen";

export const metadata: Metadata = {
  title: "Evolução · Guf",
};

/** Evolução por exercício: /exercicio?id=<exercício> (rota fixa com query string). */
export default function ExerciseEvolutionPage() {
  return <EvolutionScreen />;
}
