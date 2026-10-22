import type { PlanFeature } from "@guf/core";
import { withDevState } from "@/shared/helpers/dev-state-path";

/** Tela de planos; `feature` = o que levou a pessoa até lá (destacado na comparação). */
export function plansPath(feature?: PlanFeature | null): string {
  return withDevState(feature ? `/planos?recurso=${feature}` : "/planos");
}
