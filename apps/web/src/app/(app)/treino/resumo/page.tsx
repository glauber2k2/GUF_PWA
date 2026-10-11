import type { Metadata } from "next";
import { SummaryScreen } from "@/components/summary/summary-screen";

export const metadata: Metadata = {
  title: "Resumo do treino · Guf",
};

/** Resumo de um treino concluído: /treino/resumo?id=<sessão> (rota fixa com query string). */
export default function WorkoutSummaryPage() {
  return <SummaryScreen />;
}
