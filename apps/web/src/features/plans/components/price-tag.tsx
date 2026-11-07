import { PiggyBank, Sparkles } from "lucide-react";
import { buildPriceDisplay, formatAnnualSavings, type AnnualSavings, type PlanPrice } from "@guf/core";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/helpers/class-names";

type PriceTagSize = "hero" | "card";

const AMOUNT_CLASS: Record<PriceTagSize, string> = {
  hero: "text-[56px] leading-[56px] tracking-[-0.01em]",
  card: "text-[40px] leading-10",
};

export interface PriceTagProps {
  price: PlanPrice;
  /** hero = tela do Pro (centralizado); card = cartão da oferta (alinhado à esquerda). */
  size?: PriceTagSize;
  /** Economia do anual sobre o mensal: aparece só quando o preço mostrado é o anual. */
  savings?: AnnualSavings | null;
  className?: string;
}

/**
 * Preço da oferta: o valor POR MÊS em destaque (no anual, o total dividido por 12), como é cobrado
 * de fato e, se houver, o selo da promoção com o preço que vale depois. Todos os números vêm de
 * `plan_prices` por `buildPriceDisplay` (packages/core/src/plan-pricing.ts).
 */
export function PriceTag({ price, size = "card", savings = null, className }: PriceTagProps) {
  const display = buildPriceDisplay(price);
  const isCentered = size === "hero";
  return (
    <div className={cn("flex flex-col gap-1.5", isCentered ? "items-center text-center" : "items-start", className)}>
      {display.promotion && (
        <Badge variant="accent" className="h-6 px-2.5 text-[12px] font-semibold">
          <Sparkles aria-hidden="true" />
          {display.promotion.label}
        </Badge>
      )}
      <p className={cn("m-0 flex items-baseline gap-1.5 text-accent-text", isCentered && "justify-center")}>
        <span className={cn("font-display font-bold tabular-nums", AMOUNT_CLASS[size])}>{display.amount}</span>
        <span className="text-[15px] font-semibold text-fg-secondary">{display.suffix}</span>
      </p>
      <span className="text-[13px] leading-[18px] font-medium text-fg-secondary tabular-nums">{display.billedText}</span>
      {display.promotion && <span className="text-xs leading-4 text-fg-muted tabular-nums">{display.promotion.regularText}</span>}
      {display.renewalNote && <span className="text-xs leading-4 text-fg-muted">{display.renewalNote}</span>}
      {savings && price.interval === "year" && (
        <span className="flex items-center gap-1.5 text-[13px] leading-[18px] font-semibold text-accent-text tabular-nums">
          <PiggyBank aria-hidden="true" className="size-4 flex-none" />
          {formatAnnualSavings(savings)}
        </span>
      )}
    </div>
  );
}
