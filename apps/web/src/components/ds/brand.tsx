import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Símbolo "Anel": anel de progresso aberto + ponto (a próxima série). Grade 48. */
function RingMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
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

export interface LogoProps {
  size?: number;
  /** "brand": símbolo em volt (accent-text); "mono": herda a cor do texto. */
  tone?: "brand" | "mono";
  wordmark?: boolean;
  className?: string;
}

export function Logo({ size = 26, tone = "brand", wordmark = true, className }: LogoProps) {
  const textSize = size >= 40 ? Math.round(size * 1.286) : size;
  return (
    <span
      role="img"
      aria-label="Guf"
      className={cn("inline-flex items-center", className)}
      style={{ gap: Math.round(size * 0.22) }}
    >
      <span className={cn("flex", tone === "brand" ? "text-accent-text" : "text-current")}>
        <RingMark size={size} />
      </span>
      {wordmark && (
        <span
          className={cn(
            "font-display leading-none font-bold tracking-[-0.02em]",
            tone === "brand" ? "text-fg" : "text-current",
          )}
          style={{ fontSize: textSize }}
        >
          guf
        </span>
      )}
    </span>
  );
}

/** Ícone do app: símbolo volt sobre fundo ink, raio 25% do tamanho. */
export function AppIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("grid flex-none place-items-center bg-[var(--ink-950)] text-[var(--volt-400)]", className)}
      style={{ width: size, height: size, borderRadius: size * 0.25 }}
    >
      <RingMark size={size * 0.667} />
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
  style?: CSSProperties;
}

/** Wrapper fino do Lucide: traço 2px, currentColor. */
export function Icon({ icon: IconComponent, size = 20, label, spin = false, className, style }: IconProps) {
  return (
    <IconComponent
      size={size}
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0", spin && "animate-guf-spin", className)}
      style={style}
    />
  );
}
