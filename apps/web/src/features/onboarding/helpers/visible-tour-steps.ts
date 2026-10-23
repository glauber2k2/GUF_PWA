import type { TourFacts, TourStep } from "@/features/onboarding/constants/tour-steps";

/** Passos que valem para esta conta: os sem condição e os cuja condição é verdadeira. */
export function visibleTourSteps(steps: readonly TourStep[], facts: TourFacts): readonly TourStep[] {
  return steps.filter((step) => step.showIf === undefined || facts[step.showIf]);
}
