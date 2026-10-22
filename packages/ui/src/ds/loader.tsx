import type { ReactNode } from "react";
import { cn } from "../helpers/class-names";
import { WordmarkShapes } from "./brand";
import { DOT, LOGO_ASPECT, LOGO_VIEWBOX, MARK_VIEWBOX, RING } from "./brand-geometry";

/*
 * GufLoader — 10 animações numeradas do símbolo "Anel" (Claude Design · "Guf Loading").
 * Uso no app: 02 Desenho em todo carregamento (botões, abertura); 07 Ponto saltitante ao salvar treino.
 * Movimento reduzido: tudo vira pulso de opacidade (1 → 0,5); halos e ondas somem (base.css).
 */

export type GufLoaderVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Nome, uso e ciclo de cada animação (vitrine do design system). */
export const GUF_LOADER_VARIANTS: ReadonlyArray<{ variant: GufLoaderVariant; name: string; description: string; cycle: string }> = [
  { variant: 1, name: "Giro", description: "O símbolo gira em ritmo constante. O mais discreto; bom dentro de botões.", cycle: "1.000ms" },
  { variant: 2, name: "Desenho", description: "O anel se desenha, o ponto entra com pop, segura e recolhe.", cycle: "1.800ms" },
  { variant: 3, name: "Pulso do ponto", description: "Anel parado; o ponto (a próxima série) pulsa soltando uma onda.", cycle: "1.200ms" },
  { variant: 4, name: "Fechar o anel", description: "O arco fecha o espaço, absorve o ponto e reabre: a série completa.", cycle: "1.600ms" },
  { variant: 5, name: "Respiração", description: "O símbolo cresce e encolhe com a opacidade, num ritmo calmo.", cycle: "1.800ms (ida e volta)" },
  { variant: 6, name: "Arco elástico", description: "Só o arco: estica e encolhe enquanto gira (spinner indeterminado).", cycle: "1.400ms" },
  { variant: 7, name: "Ponto saltitante", description: "Anel parado e o ponto quica, como quem conta repetições.", cycle: "760ms (ida e volta)" },
  { variant: 8, name: "Cometa", description: "Trilha suave do anel com um arco curto e o ponto à frente dando voltas. Botões com loading.", cycle: "1.100ms" },
  { variant: 9, name: "Sonar", description: "O símbolo parado emite dois halos que se expandem e somem. Abertura do app.", cycle: "1.800ms (halos a cada 900ms)" },
  { variant: 10, name: "Pêndulo", description: "O símbolo balança de −35° a 35°, lembrando o movimento de uma série.", cycle: "1.400ms (ida e volta)" },
];

const TONES = {
  brand: { stroke: "stroke-accent-text", fill: "fill-accent-text", track: "stroke-accent-text/18", text: "text-fg" },
  mono: { stroke: "stroke-current", fill: "fill-current", track: "stroke-current/18", text: "text-current" },
  onAccent: { stroke: "stroke-accent-foreground", fill: "fill-accent-foreground", track: "stroke-accent-foreground/18", text: "text-accent-foreground" },
} as const;

export type GufLoaderTone = keyof typeof TONES;

/** Animações giram/escalam em torno do centro do anel ou do ponto (coordenadas da grade 48). */
const AROUND_RING = "[transform-box:view-box] origin-[24px_24px]";
const AROUND_DOT = "[transform-box:view-box] origin-[32px_10.14px]";
/** Elemento animado: com movimento reduzido vira pulso de opacidade. */
const PULSE = "guf-motion-pulse";
/** Halo/onda: some com movimento reduzido. */
const HALO = "guf-motion-hide";

function Ring({ tone, className, dasharray = RING.dasharray, rotated = true }: { tone: GufLoaderTone; className?: string; dasharray?: string; rotated?: boolean }) {
  return (
    <circle
      cx={RING.cx}
      cy={RING.cy}
      r={RING.r}
      strokeWidth={RING.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dasharray}
      transform={rotated ? RING.transform : undefined}
      className={cn("fill-none", TONES[tone].stroke, className)}
    />
  );
}

function Dot({ tone, className, cx = DOT.cx, cy = DOT.cy }: { tone: GufLoaderTone; className?: string; cx?: number; cy?: number }) {
  return <circle cx={cx} cy={cy} r={DOT.r} className={cn(TONES[tone].fill, className)} />;
}

/** As formas animadas de cada variante (dentro do <svg>, grade 48). */
function LoaderMark({ variant, tone }: { variant: GufLoaderVariant; tone: GufLoaderTone }) {
  switch (variant) {
    case 2:
      return (
        <g>
          <Ring tone={tone} className={cn("animate-gl-draw", PULSE)} />
          <Dot tone={tone} className={cn(AROUND_DOT, "animate-gl-dotpop", PULSE)} />
        </g>
      );
    case 3:
      return (
        <g>
          <Ring tone={tone} />
          <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} strokeWidth={1.5} className={cn("fill-none", TONES[tone].stroke, AROUND_DOT, "animate-gl-ripple", HALO)} />
          <Dot tone={tone} className={cn(AROUND_DOT, "animate-gl-beat", PULSE)} />
        </g>
      );
    case 4:
      return (
        <g>
          <Ring tone={tone} className={cn("animate-gl-close", PULSE)} />
          <Dot tone={tone} className={cn(AROUND_DOT, "animate-gl-absorb", PULSE)} />
        </g>
      );
    case 5:
      return (
        <g className={cn(AROUND_RING, "animate-gl-breathe", PULSE)}>
          <Ring tone={tone} />
          <Dot tone={tone} />
        </g>
      );
    case 6:
      return (
        <g className={cn(AROUND_RING, "animate-gl-spin-1400", PULSE)}>
          <Ring tone={tone} className="animate-gl-elastic" />
        </g>
      );
    case 7:
      return (
        <g>
          <Ring tone={tone} />
          <Dot tone={tone} className={cn(AROUND_DOT, "animate-gl-hop", PULSE)} />
        </g>
      );
    case 8:
      return (
        <g>
          <circle cx={RING.cx} cy={RING.cy} r={RING.r} strokeWidth={RING.strokeWidth} className={cn("fill-none", TONES[tone].track)} />
          <g className={cn(AROUND_RING, "animate-gl-spin-1100", PULSE)}>
            <Ring tone={tone} dasharray="30 200" rotated={false} />
            <Dot tone={tone} cx={10.58} cy={32.71} />
          </g>
        </g>
      );
    case 9:
      return (
        <g>
          {/* 2º halo 900 ms depois; durante o atraso fica no 1º quadro, que é invisível (gl-sonar em
              base.css). opacity-0 = invisível enquanto a animação não roda. */}
          {["", "[animation-delay:900ms] [animation-fill-mode:backwards]"].map((delay) => (
            <circle
              key={delay || "first"}
              cx={RING.cx}
              cy={RING.cy}
              r={19.5}
              strokeWidth={2}
              className={cn("fill-none opacity-0", TONES[tone].stroke, AROUND_RING, "animate-gl-sonar", delay, HALO)}
            />
          ))}
          <Ring tone={tone} />
          <Dot tone={tone} />
        </g>
      );
    case 10:
      return (
        <g className={cn(AROUND_RING, "animate-gl-swing", PULSE)}>
          <Ring tone={tone} />
          <Dot tone={tone} />
        </g>
      );
    default:
      return (
        <g className={cn(AROUND_RING, "animate-gl-spin-1000", PULSE)}>
          <Ring tone={tone} />
          <Dot tone={tone} />
        </g>
      );
  }
}

export interface GufLoaderProps {
  /** 1–10 (ver GUF_LOADER_VARIANTS). Padrão do app: 2 (Desenho). */
  variant?: GufLoaderVariant;
  /** Altura em px (o símbolo é quadrado; com wordmark, a logo completa). */
  size?: number;
  /** "brand" (volt), "mono" (cor do texto ao redor) ou "onAccent" (dentro de botão volt). */
  tone?: GufLoaderTone;
  /** Logo completa (símbolo animado + "guf"). */
  wordmark?: boolean;
  /** Texto ao lado (row) ou abaixo (column). */
  text?: ReactNode;
  layout?: "row" | "column";
  textSize?: number;
  /** Rótulo para leitores de tela (padrão: o texto ou "Carregando"). */
  label?: string;
  className?: string;
}

/** Indicador de carregamento da marca. role="status" com rótulo acessível. */
export function GufLoader({
  variant = 2,
  size = 48,
  tone = "brand",
  wordmark = false,
  text,
  layout = "row",
  textSize = 14,
  label,
  className,
}: GufLoaderProps) {
  const column = layout === "column";
  return (
    <span
      role="status"
      aria-label={label ?? (typeof text === "string" && text ? text : "Carregando")}
      // Espaço e corpo do texto proporcionais ao tamanho (valores dinâmicos).
      style={{ gap: Math.round(size * (column ? 0.4 : 0.3)) }}
      className={cn("inline-flex items-center", column ? "flex-col" : "flex-row", TONES[tone].text, className)}
    >
      <svg
        viewBox={wordmark ? LOGO_VIEWBOX : MARK_VIEWBOX}
        width={wordmark ? size * LOGO_ASPECT : size}
        height={size}
        aria-hidden="true"
        className="block flex-none overflow-visible"
      >
        <LoaderMark variant={variant} tone={tone} />
        {wordmark && <WordmarkShapes tone={tone === "brand" ? "brand" : "mono"} />}
      </svg>
      {text && (
        <span style={{ fontSize: textSize }} className="leading-[1.4] font-medium text-fg-secondary">
          {text}
        </span>
      )}
    </span>
  );
}
