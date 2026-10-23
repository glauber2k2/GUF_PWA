"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHomeSummary } from "@/features/home";
import { useActiveWorkout } from "@/features/workout";
import { TOUR_STEPS, TOUR_VERSION, type TourFacts, type TourStep } from "@/features/onboarding/constants/tour-steps";
import { visibleTourSteps } from "@/features/onboarding/helpers/visible-tour-steps";
import { TourOverlay } from "@/features/onboarding/components/tour-overlay";
import { useCompleteTour, useTourProgress } from "@/features/onboarding/api/use-tour-progress";

/** O tour começa sozinho só na Início (nunca puxa quem abriu um link direto para outra tela). */
const AUTO_START_ROUTE = "/";

const NO_FACTS: TourFacts = { hasGeneratedHandle: false };

interface TourApi {
  /** Começa (ou recomeça) o tour do primeiro passo. */
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourApi | null>(null);

/**
 * Tour de onboarding da área logada: começa sozinho na primeira entrada DA CONTA (a conclusão fica no
 * perfil, vale em todos os aparelhos; sem treino em andamento),
 * navega até a rota de cada passo e só mostra o overlay quando a rota bate. Pular conta como
 * concluído. Se a pessoa sair da rota do passo (ex.: voltar do sistema), o tour fica pausado e
 * reaparece ao voltar.
 *
 * Os passos com condição dependem de `facts` (montados em app/). A lista é fixada ao começar: um
 * fato que mude no meio (ex.: a pessoa troca o @) não desloca os passos.
 */
export function TourProvider({ children, facts }: { children: ReactNode; facts: TourFacts | undefined }) {
  const router = useRouter();
  // trailingSlash: true → normalizar "/projetos/" para "/projetos".
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const { active } = useActiveWorkout();
  const summary = useHomeSummary();
  // O treino aberto no banco só chega ao aparelho depois (efeito do AppShell): conferir os dois.
  const hasWorkout = Boolean(active) || Boolean(summary.data?.inProgress);
  const progress = useTourProgress();
  const { mutate: completeTour } = useCompleteTour();
  const isDone = (progress.data?.completedVersion ?? 0) >= TOUR_VERSION;
  // Sem resposta da conta (carregando ou sem internet) não conta como pendente.
  const isPending = progress.data !== undefined && !isDone;
  const [index, setIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<readonly TourStep[]>(TOUR_STEPS);
  const [autoStarted, setAutoStarted] = useState(false);

  // Primeira entrada: começa uma vez por sessão (ajuste durante a renderização, sem efeito).
  if (!autoStarted && isPending && facts && !summary.isPending && !hasWorkout && pathname === AUTO_START_ROUTE) {
    setAutoStarted(true);
    setSteps(visibleTourSteps(TOUR_STEPS, facts));
    setIndex(0);
  }

  const goTo = useCallback(
    (next: number, list: readonly TourStep[] = steps) => {
      const step = list[next];
      if (!step) return;
      setIndex(next);
      if (step.route !== pathname) router.push(step.route);
    },
    [pathname, router, steps],
  );

  const finish = useCallback(() => {
    // Rever pelas Configurações não grava de novo.
    if (!isDone) completeTour(TOUR_VERSION);
    setIndex(null);
  }, [isDone, completeTour]);

  const start = useCallback(() => {
    // Sem os fatos ainda (ex.: sem internet), os passos com condição ficam de fora.
    const list = visibleTourSteps(TOUR_STEPS, facts ?? NO_FACTS);
    setSteps(list);
    goTo(0, list);
  }, [facts, goTo]);

  const api = useMemo<TourApi>(() => ({ start, active: index !== null }), [start, index]);
  const step = index === null ? null : steps[index];

  return (
    <TourContext.Provider value={api}>
      {children}
      {step && index !== null && step.route === pathname && (
        <TourOverlay
          step={step}
          position={index + 1}
          total={steps.length}
          onNext={() => (index === steps.length - 1 ? finish() : goTo(index + 1))}
          onBack={index > 0 ? () => goTo(index - 1) : undefined}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}

/** Controle do tour (ex.: "Ver tutorial novamente" em Configurações). */
export function useTour(): TourApi {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour precisa estar dentro de <TourProvider>.");
  return ctx;
}
