import { Crown, type LucideIcon } from "lucide-react";
import type { Entitlements } from "@guf/core";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/helpers/class-names";

/** O que o selo precisa saber do usuário (os direitos do usuário logado já servem). */
export type PlanBadgeUser = Pick<Entitlements, "planName" | "isDefaultPlan">;

type PlanTier = "default" | "paid";

/** Aparência por nível, não por nome: um plano novo (ex.: Personal) já sai certo sem mexer aqui. */
const PLAN_BADGE_APPEARANCE: Record<PlanTier, { variant: "accent" | "muted"; icon: LucideIcon | null }> = {
  default: { variant: "muted", icon: null },
  paid: { variant: "accent", icon: Crown },
};

export interface PlanBadgeProps {
  user: PlanBadgeUser;
  className?: string;
}

/** Selo do plano ao lado do @ (Badge do shadcn com as variantes do guf). */
export function PlanBadge({ user, className }: PlanBadgeProps) {
  const { variant, icon: TierIcon } = PLAN_BADGE_APPEARANCE[user.isDefaultPlan ? "default" : "paid"];
  return (
    <Badge variant={variant} aria-label={`Plano ${user.planName}`} className={cn("h-5 px-2 text-[11px] font-bold tracking-[0.06em] uppercase", className)}>
      {TierIcon && <TierIcon data-icon="inline-start" aria-hidden="true" />}
      {user.planName}
    </Badge>
  );
}
