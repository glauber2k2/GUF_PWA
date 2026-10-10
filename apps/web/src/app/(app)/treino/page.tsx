import type { Metadata } from "next";
import { WorkoutScreen } from "@/components/workout/workout-screen";

export const metadata: Metadata = {
  title: "Treino · Guf",
};

/** Treino em andamento: /treino?id=<sessão> (rota fixa com query string). */
export default function WorkoutPage() {
  return <WorkoutScreen />;
}
