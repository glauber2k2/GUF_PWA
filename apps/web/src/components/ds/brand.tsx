import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Símbolo "Anel": anel de progresso aberto + ponto (a próxima série). Grade 48. */
function RingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <circle
        cx="24"
        cy="24"
        r="16"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="78.2 200"
        transform="rotate(-20 24 24)"
      />
      <circle cx="32" cy="10.14" r="4.5" fill="currentColor" />
    </svg>
  );
}

/** Tamanhos do logo (símbolo · espaço · wordmark). A partir de 40px o wordmark cresce 1,286×. */
const LOGO_SIZES = {
  sm: { mark: "size-[26px]", gap: "gap-1.5", text: "text-[26px]" },
  md: { mark: "size-8", gap: "gap-[7px]", text: "text-[32px]" },
  lg: { mark: "size-10", gap: "gap-[9px]", text: "text-[51px]" },
  xl: { mark: "size-14", gap: "gap-3", text: "text-[72px]" },
  "2xl": { mark: "size-20", gap: "gap-[18px]", text: "text-[103px]" },
} as const;

export interface LogoProps {
  size?: keyof typeof LOGO_SIZES;
  /** "brand": símbolo em volt (accent-text); "mono": herda a cor do texto. */
  tone?: "brand" | "mono";
  wordmark?: boolean;
  className?: string;
}

export function Logo({ size = "sm", tone = "brand", wordmark = true, className }: LogoProps) {
  const s = LOGO_SIZES[size];
  return (
    <span role="img" aria-label="Guf" className={cn("inline-flex items-center", s.gap, className)}>
      <span className={cn("flex", tone === "brand" ? "text-accent-text" : "text-current")}>
        <RingMark className={s.mark} />
      </span>
      {wordmark && (
        <span
          className={cn(
            "font-display leading-none font-bold tracking-[-0.02em]",
            s.text,
            tone === "brand" ? "text-fg" : "text-current",
          )}
        >
          guf
        </span>
      )}
    </span>
  );
}

/** Ícone do app: símbolo volt sobre fundo ink, raio = 25% do lado, símbolo = 2/3 do lado. */
const APP_ICON_SIZES = {
  sm: { box: "size-10 rounded-[10px]", mark: "size-[27px]" },
  md: { box: "size-12 rounded-md", mark: "size-8" },
  lg: { box: "size-16 rounded-lg", mark: "size-[43px]" },
} as const;

export function AppIcon({ size = "md", className }: { size?: keyof typeof APP_ICON_SIZES; className?: string }) {
  const s = APP_ICON_SIZES[size];
  return (
    <div className={cn("grid flex-none place-items-center bg-brand-ink text-brand-volt", s.box, className)}>
      <RingMark className={s.mark} />
    </div>
  );
}

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  /** Rótulo para leitores de tela; sem ele o ícone é decorativo. */
  label?: string;
  spin?: boolean;
  className?: string;
}

/** Wrapper fino do Lucide: traço 2px, currentColor. */
export function Icon({ icon: IconComponent, size = 20, label, spin = false, className }: IconProps) {
  return (
    <IconComponent
      size={size}
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0", spin && "animate-guf-spin", className)}
    />
  );
}
