"use client";

import type { ReactNode } from "react";
import { isGeneratedHandle } from "@guf/core";
import { TourProvider, type TourFacts } from "@/features/onboarding";
import { useMySocial } from "@/features/social";

/**
 * Composição do tour com os fatos da conta: o tour não importa as features de onde eles vêm
 * (social já importa o onboarding pelos alvos do tour). Fato novo = mais um campo aqui.
 */
export function OnboardingTour({ children }: { children: ReactNode }) {
  const social = useMySocial();
  // Erro na consulta não segura o tour: segue sem os passos que dependem dela.
  const facts: TourFacts | undefined = social.isPending ? undefined : { hasGeneratedHandle: isGeneratedHandle(social.data?.handle) };
  return <TourProvider facts={facts}>{children}</TourProvider>;
}
