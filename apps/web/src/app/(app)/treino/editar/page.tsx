import type { Metadata } from "next";
import { WorkoutEditScreen } from "@/features/workout";

export const metadata: Metadata = {
  title: "Editar treino · Guf",
};

/** Editar um treino concluído: /treino/editar?id=<sessão> (rota fixa com query string). */
export default function WorkoutEditPage() {
  return <WorkoutEditScreen />;
}
