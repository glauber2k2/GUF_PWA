import type { Metadata } from "next";
import { PlansScreen } from "@/features/plans";

export const metadata: Metadata = {
  title: "Planos · guf",
};

/** Planos Free e Pro: comparação e assinatura (aberta pela tela do Pro e por Configurações). */
export default function PlansPage() {
  return <PlansScreen />;
}
