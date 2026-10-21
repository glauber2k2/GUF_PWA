import { ArrowUpRight, Replace, Timer, TrendingUp, type LucideIcon } from "lucide-react";

/** Atalhos da conversa vazia (protótipo "Guf AI"; o de montar treino virou substituição de exercício). */
export const AI_SUGGESTIONS: { icon: LucideIcon; text: string }[] = [
  { icon: TrendingUp, text: "Como está meu supino?" },
  { icon: ArrowUpRight, text: "Posso subir a carga hoje?" },
  { icon: Replace, text: "Alternativa para o 2º exercício de hoje" },
  { icon: Timer, text: "Quanto descansar entre séries?" },
];
