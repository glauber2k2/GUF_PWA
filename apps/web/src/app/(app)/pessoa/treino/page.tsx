import type { Metadata } from "next";
import { MemberWorkoutScreen } from "@/features/social";

export const metadata: Metadata = {
  title: "Treino · Guf",
};

/** Treino concluído de outra pessoa: /pessoa/treino?id=<sessão> (rota fixa com query string). */
export default function MemberWorkoutPage() {
  return <MemberWorkoutScreen />;
}
