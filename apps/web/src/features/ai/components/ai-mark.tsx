import { cn } from "@/shared/helpers/class-names";

/**
 * Símbolo do GUF AI (Claude Design "Guf AI"): o anel da marca com uma estrela no centro.
 * Cor por `currentColor`; `twinkle` faz a estrela girar de tempos em tempos (parada em movimento reduzido).
 */
export function AiMark({ size, twinkle = false, className }: { size: number; twinkle?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={cn("block overflow-visible", className)}>
      <circle
        cx="24"
        cy="24"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="83.78 16.76"
        transform="rotate(-15 24 24)"
      />
      <circle cx="35.31" cy="12.69" r="2.6" fill="currentColor" />
      <path
        d="M24 15.5 Q25.2 22.8 32.5 24 Q25.2 25.2 24 32.5 Q22.8 25.2 15.5 24 Q22.8 22.8 24 15.5 Z"
        fill="currentColor"
        className={cn("origin-center [transform-box:fill-box]", twinkle && "animate-guf-ai-twinkle")}
      />
    </svg>
  );
}
