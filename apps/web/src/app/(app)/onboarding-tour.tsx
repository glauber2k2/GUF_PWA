"use client";

import type { ReactNode } from "react";
import { isGeneratedHandle } from "@guf/core";
import { ProfileSetupRedirect, TourProvider, useProfileSetupStatus, type TourFacts } from "@/features/onboarding";
import { useMySocial } from "@/features/social";

/**
 * Composição do tour com os fatos da conta: o tour não importa as features de onde eles vêm
 * (social já importa o onboarding pelos alvos do tour). Fato novo = mais um campo aqui.
 * Conta nova passa antes pelo cadastro em passos (ProfileSetupRedirect); o tour espera ele acabar
 * para não abrir por cima e para ler o @ que a pessoa escolheu.
 */
export function OnboardingTour({ children }: { children: ReactNode }) {
  const social = useMySocial();
  const setup = useProfileSetupStatus();
  // Erro na consulta não segura o tour: segue sem os passos que dependem dela.
  const isWaitingSetup = setup.isPending || setup.data?.isCompleted === false;
  const facts: TourFacts | undefined =
    social.isPending || isWaitingSetup ? undefined : { hasGeneratedHandle: isGeneratedHandle(social.data?.handle) };
  return (
    <TourProvider facts={facts}>
      <ProfileSetupRedirect />
      {children}
    </TourProvider>
  );
}
