import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/helpers/class-names";
import { DOT, LOGO_VIEWBOX, MARK_VIEWBOX, RING, WORDMARK_PATHS, WORDMARK_TRANSFORM } from "./brand-geometry";

/** Cores da marca: "brand" = símbolo volt (accent-text) e wordmark na cor do texto; "mono" = herda a cor (currentColor). */
const MARK_TONES = {
  brand: { ring: "stroke-accent-text", dot: "fill-accent-text", word: "stroke-fg" },
  mono: { ring: "stroke-current", dot: "fill-current", word: "stroke-current" },
} as const;

export type BrandTone = keyof typeof MARK_TONES;

/** Anel + ponto (grade 48), para usar dentro de um <svg>. */
export function MarkShapes({ tone = "brand" }: { tone?: BrandTone }) {
  const t = MARK_TONES[tone];
  return (
    <>
      <circle
        cx={RING.cx}
        cy={RING.cy}
        r={RING.r}
        strokeWidth={RING.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={RING.dasharray}
        transform={RING.transform}
        className={cn("fill-none", t.ring)}
      />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} className={t.dot} />
    </>
  );
}

/** Wordmark "guf" em traços (mesma grade do anel), para usar dentro do <svg> da logo. */
export function WordmarkShapes({ tone = "brand" }: { tone?: BrandTone }) {
  return (
    <g strokeWidth={7} strokeLinejoin="round" transform={WORDMARK_TRANSFORM} className={cn("fill-none", MARK_TONES[tone].word)}>
      {WORDMARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

/**
 * Tamanhos da logo (altura do SVG). Com wordmark, a logo completa (assets/guf-logo-*.svg);
 * sem, só o símbolo.
 */
const LOGO_SIZES = {
  sm: { full: "h-8", mark: "size-[26px]" },
  md: { full: "h-10", mark: "size-8" },
  lg: { full: "h-14", mark: "size-10" },
  xl: { full: "h-[76px]", mark: "size-14" },
  "2xl": { full: "h-[104px]", mark: "size-20" },
} as const;

export interface LogoProps {
  size?: keyof typeof LOGO_SIZES;
  /** "brand": símbolo volt + wordmark na cor do texto (claro/escuro pelo tema); "mono": herda a cor. */
  tone?: BrandTone;
  wordmark?: boolean;
  className?: string;
}

/** Logo guf em SVG (sem texto de fonte): segue o tema pelos tokens (volt + texto; no claro, verde escuro AA). */
export function Logo({ size = "sm", tone = "brand", wordmark = true, className }: LogoProps) {
  const s = LOGO_SIZES[size];
  return (
    <svg
      role="img"
      aria-label="guf"
      viewBox={wordmark ? LOGO_VIEWBOX : MARK_VIEWBOX}
      className={cn("block flex-none overflow-visible", wordmark ? cn(s.full, "aspect-[141.5/76.65] w-auto") : s.mark, className)}
    >
      <MarkShapes tone={tone} />
      {wordmark && <WordmarkShapes tone={tone} />}
    </svg>
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
      <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={s.mark}>
        <MarkShapes tone="mono" />
      </svg>
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
