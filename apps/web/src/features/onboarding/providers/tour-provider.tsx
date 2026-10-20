"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHomeSummary } from "@/features/home";
import { useActiveWorkout } from "@/features/workout";
import { createDevicePreference } from "@/shared/preferences/device-preference";
import { TOUR_STEPS } from "@/features/onboarding/constants/tour-steps";
import { TourOverlay } from "@/features/onboarding/components/tour-overlay";

/**
 * Conclusão do tour no aparelho. Versionada: um tour novo aparece de novo para todos (v2 = tour
 * completo, que substituiu o curto de 6 passos da v1).
 */
const tourCompletion = createDevicePreference("guf:tour:main:v2", ["pending", "done"] as const, "pending");

/** O tour começa sozinho só na Início (nunca puxa quem abriu um link direto para outra tela). */
const AUTO_START_ROUTE = "/";

interface TourApi {
  /** Começa (ou recomeça) o tour do primeiro passo. */
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourApi | null>(null);

/**
 * Tour de onboarding da área logada: começa sozinho na primeira entrada (sem treino em andamento),
 * navega até a rota de cada passo e só mostra o overlay quando a rota bate. Pular conta como
 * concluído. Se a pessoa sair da rota do passo (ex.: voltar do sistema), o tour fica pausado e
 * reaparece ao voltar.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // trailingSlash: true → normalizar "/projetos/" para "/projetos".
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const { active } = useActiveWorkout();
  const summary = useHomeSummary();
  // O treino aberto no banco só chega ao aparelho depois (efeito do AppShell): conferir os dois.
  const hasWorkout = Boolean(active) || Boolean(summary.data?.inProgress);
  const [completion, setCompletion] = tourCompletion.use();
  const [index, setIndex] = useState<number | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // Primeira entrada: começa uma vez por sessão (ajuste durante a renderização, sem efeito).
  if (!autoStarted && completion === "pending" && !summary.isPending && !hasWorkout && pathname === AUTO_START_ROUTE) {
    setAutoStarted(true);
    setIndex(0);
  }

  const goTo = useCallback(
    (next: number) => {
      const step = TOUR_STEPS[next];
      if (!step) return;
      setIndex(next);
      if (step.route !== pathname) router.push(step.route);
    },
    [pathname, router],
  );

  const finish = useCallback(() => {
    setCompletion("done");
    setIndex(null);
  }, [setCompletion]);

  const start = useCallback(() => goTo(0), [goTo]);

  const api = useMemo<TourApi>(() => ({ start, active: index !== null }), [start, index]);
  const step = index === null ? null : TOUR_STEPS[index];

  return (
    <TourContext.Provider value={api}>
      {children}
      {step && index !== null && step.route === pathname && (
        <TourOverlay
          step={step}
          position={index + 1}
          total={TOUR_STEPS.length}
          onNext={() => (index === TOUR_STEPS.length - 1 ? finish() : goTo(index + 1))}
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
