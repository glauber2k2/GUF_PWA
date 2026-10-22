import type { ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "../helpers/class-names";
import { Icon } from "./brand";

/*
 * MuscleIcon — silhueta humana (frente ou costas) com o grupo trabalhado em volt
 * (Claude Design · "Guf Loading" §5). Estático para listas e filtros; animado para destaque:
 * entrada em pop e duas "repetições" (contrai 12% com brilho) a cada 2.400ms.
 * Movimento reduzido: pulso de opacidade; o brilho some.
 */

export type MuscleIconKey =
  | "peito"
  | "ombro"
  | "costas"
  | "trapezio"
  | "abdomen"
  | "biceps"
  | "triceps"
  | "antebraco"
  | "gluteos"
  | "quadriceps"
  | "posterior"
  | "panturrilha";

/** Metade esquerda do contorno do corpo (espelhada para formar a silhueta). Grade 100. */
const LEFT: ReadonlyArray<readonly [number, number]> = [
  [46.8, 16], [46.6, 20.6], [40, 22.6], [36, 24], [33.6, 26.6], [32.6, 30.6], [31.6, 38], [30.8, 44.6], [29.4, 51], [28.6, 57],
  [28.2, 61], [27.6, 64.6], [28.6, 67], [30.4, 66.6], [31, 63.4], [31.6, 59.4], [33.4, 52], [35.2, 45.6], [36.4, 39.8], [37.4, 35.4],
  [38, 39.6], [39.8, 45.6], [40.4, 50.2], [38.6, 55], [36.8, 60], [37, 67], [38.2, 74], [37.4, 79], [37.6, 84], [39.2, 92.6],
  [38.2, 96], [39.8, 97.6], [44.2, 97.6], [44.8, 95], [44.6, 92], [45.6, 84], [45.8, 78], [46.4, 73.6], [47.8, 66], [48.8, 61], [50, 59.4],
];
const BODY = `M${[...LEFT, ...LEFT.slice(0, -1).reverse().map(([x, y]) => [100 - x, y] as const)].map((p) => p.join(" ")).join("L")}Z`;

/** Partes musculares: [caminho do lado esquerdo, espelhar para o direito]. */
const PARTS: Record<string, readonly [string, boolean]> = {
  delt: ["M38.4 24Q34 24.6 32.9 29L33.2 34.6Q35.4 31.2 38.6 28.6Z", true],
  chest: ["M49 26.4Q42.6 25.2 39 27.8L38.2 33Q42 37 49 35.6Z", true],
  arm: ["M34.6 35Q32.2 38.2 32.5 42.8Q33.6 45.8 35.4 44.4Q37.6 40.6 36.8 35.8Q35.6 34.4 34.6 35Z", true],
  triO: ["M33.4 33.4Q31.4 38.6 31.9 44.8L33.7 45Q33.6 39.4 35 34.2Z", true],
  triL: ["M35.8 34.4Q37.2 39 36.5 44L35 45.4Q34.6 40 35 35Z", true],
  fore: ["M31.2 47.6Q29.8 53 30 58L31.4 58.2Q33 52 34 47Q32.6 46.8 31.2 47.6Z", true],
  abs1: ["M44.8 37.4H49.2V42H44.8Z", true],
  abs2: ["M44.8 43H49.2V47.6H44.8Z", true],
  abs3: ["M45 48.6H49.2V54Q46.4 54 45 52.6Z", true],
  quad: ["M38.8 60.6Q37.4 66 38.8 72.4Q42.6 74.4 46 72.2Q47.6 66.4 47.6 62Q43 60 38.8 60.6Z", true],
  calf: ["M38.6 76.4Q37.6 81 39.4 86Q41.6 88.2 43.4 86Q45.6 81 45.6 76.8Q42 75.4 38.6 76.4Z", true],
  trap: ["M50 17.6L53.4 21.2Q59.6 22.6 62 24.6L54.4 29L50 40.4L45.6 29L38 24.6Q40.4 22.6 46.6 21.2Z", false],
  lat: ["M38.8 29.6Q37.6 35 38.6 42Q42.4 48.2 47.8 50L48.6 41.6L45.2 30.2Q41.8 28.8 38.8 29.6Z", true],
  low: ["M47.2 51.2H52.8L53.4 56.4H46.6Z", false],
  glu: ["M49.4 57Q43.2 55.4 38.8 58Q37.6 62 39.6 65.2Q44.6 67.2 49.4 64.8Z", true],
  ham: ["M39.2 67.2Q38.4 70.4 39.4 73.6Q43 75.2 46.4 73.4Q47.6 70.4 47.6 66.6Q43.4 68 39.2 67.2Z", true],
};

const FRONT = ["delt", "chest", "arm", "fore", "abs1", "abs2", "abs3", "quad", "calf"];
const BACK = ["trap", "delt", "lat", "low", "triO", "triL", "fore", "glu", "ham", "calf"];

/** Cada grupo: vista, partes em destaque, nome e recorte do zoom (viewBox). */
export const MUSCLE_ICONS: Record<MuscleIconKey, { view: "front" | "back"; parts: string[]; name: string; zoom: string }> = {
  peito: { view: "front", parts: ["chest"], name: "Peito", zoom: "28 14 44 44" },
  ombro: { view: "front", parts: ["delt"], name: "Ombro", zoom: "24 8 52 52" },
  costas: { view: "back", parts: ["lat", "low"], name: "Costas", zoom: "26 16 48 48" },
  trapezio: { view: "back", parts: ["trap"], name: "Trapézio", zoom: "29 6 42 42" },
  abdomen: { view: "front", parts: ["abs1", "abs2", "abs3"], name: "Abdômen", zoom: "32 27 36 36" },
  biceps: { view: "front", parts: ["arm"], name: "Bíceps", zoom: "21 21 30 30" },
  triceps: { view: "back", parts: ["triO", "triL"], name: "Tríceps", zoom: "21 21 30 30" },
  antebraco: { view: "front", parts: ["fore"], name: "Antebraço", zoom: "18 43 26 26" },
  gluteos: { view: "back", parts: ["glu"], name: "Glúteos", zoom: "29 44 42 42" },
  quadriceps: { view: "front", parts: ["quad"], name: "Quadríceps", zoom: "28 52 44 44" },
  posterior: { view: "back", parts: ["ham"], name: "Posterior de coxa", zoom: "28 52 44 44" },
  panturrilha: { view: "back", parts: ["calf"], name: "Panturrilha", zoom: "25 67 32 32" },
};

export const MUSCLE_ICON_KEYS = Object.keys(MUSCLE_ICONS) as MuscleIconKey[];

/** Código do banco (exercises.muscle_group) → ícone; corpo inteiro e cardio não têm ícone. */
export function muscleIconKey(muscleGroup: string): MuscleIconKey | null {
  if (muscleGroup === "ombros") return "ombro";
  return muscleGroup in MUSCLE_ICONS ? (muscleGroup as MuscleIconKey) : null;
}

const FLIP = "translate(100 0) scale(-1 1)";
const FILL_BOX = "[transform-box:fill-box] origin-center";

function Parts({ keys, className, delay }: { keys: readonly string[]; className?: string; delay?: string }) {
  return keys.flatMap((k) => {
    const part = PARTS[k];
    if (!part) return [];
    const [d, mirror] = part;
    // Atraso de cada ícone (escalonar uma grade) — valor dinâmico.
    const path = (key: string) => <path key={key} d={d} className={className} style={delay ? { animationDelay: delay } : undefined} />;
    return mirror ? [path(k), <g key={`${k}-r`} transform={FLIP}>{path(`${k}-m`)}</g>] : [path(k)];
  });
}

export interface MuscleIconProps {
  muscle: MuscleIconKey;
  size?: number;
  /** Recorte aproximado só da região trabalhada. */
  zoom?: boolean;
  animate?: "loop" | "once" | "none";
  /** "accent": grupo em volt (verde escuro no tema claro); "mono": cor do texto. */
  tone?: "accent" | "mono";
  /** Atraso da animação em ms (escalonar uma grade de ícones). */
  delay?: number;
  /** Rótulo acessível (padrão: nome do grupo); "" = decorativo. */
  label?: string;
  className?: string;
}

export function MuscleIcon({ muscle, size = 48, zoom = false, animate = "loop", tone = "accent", delay = 0, label, className }: MuscleIconProps) {
  const icon = MUSCLE_ICONS[muscle];
  const rest = (icon.view === "front" ? FRONT : BACK).filter((k) => !icon.parts.includes(k));
  const on = animate !== "none";
  const once = animate === "once";
  const highlight = tone === "mono" ? "fill-current" : "fill-accent-text";
  return (
    // label="" = decorativo (o nome já aparece ao lado).
    <span
      role={label === "" ? undefined : "img"}
      aria-label={label === "" ? undefined : (label ?? icon.name)}
      aria-hidden={label === "" || undefined}
      className={cn("inline-flex leading-none text-fg", className)}
    >
      <svg width={size} height={size} viewBox={zoom ? icon.zoom : "0 0 100 100"} overflow={zoom ? "hidden" : "visible"} aria-hidden="true">
        <g className={on ? "animate-guf-mg-fade" : undefined} style={on ? { animationDelay: `${delay}ms` } : undefined}>
          <ellipse cx={50} cy={9.6} rx={5.8} ry={7.2} className="fill-current opacity-16" />
          <path d={BODY} strokeWidth={1.6} strokeLinejoin="round" className="fill-current stroke-current opacity-16" />
          <g className="opacity-30">
            <Parts keys={rest} className="fill-current" />
          </g>
        </g>
        {on && (
          <g className="guf-motion-hide blur-[3px]">
            <g className={once ? "animate-guf-mg-glow-once" : "animate-guf-mg-glow"} style={{ animationDelay: `${delay + 700}ms` }}>
              <Parts keys={icon.parts} className={cn(highlight, FILL_BOX, once ? "animate-guf-mg-pump-once" : "animate-guf-mg-pump")} delay={`${delay + 700}ms`} />
            </g>
          </g>
        )}
        <g>
          <Parts
            keys={icon.parts}
            className={cn(highlight, on && cn(FILL_BOX, once ? "animate-guf-mg-target-once" : "animate-guf-mg-target", "guf-motion-pulse"))}
            delay={on ? `${delay}ms, ${delay + 700}ms` : undefined}
          />
        </g>
      </svg>
    </span>
  );
}

/** O tile mostra o músculo OU, para grupos sem silhueta (ex.: cardio), um ícone do lucide. */
type MuscleFilterTileFigure = { muscle: MuscleIconKey; icon?: never } | { icon: LucideIcon; muscle?: never };

export type MuscleFilterTileProps = MuscleFilterTileFigure & {
  selected: boolean;
  onToggle: () => void;
  /** Nome curto no tile (padrão: nome do grupo; "Posterior de coxa" → "Posterior"). */
  children?: ReactNode;
  /** "md" (padrão, ícone 72px) ou "sm" (ícone 56px, tile de 83px do seletor de exercícios). */
  size?: "md" | "sm";
  className?: string;
};

/** Tile quadrado do filtro por músculo: selecionado ganha borda volt, check e ícone animado. */
export function MuscleFilterTile({ muscle, icon, selected, onToggle, children, size = "md", className }: MuscleFilterTileProps) {
  const sm = size === "sm";
  const name = children ?? (muscle === "posterior" ? "Posterior" : muscle ? MUSCLE_ICONS[muscle].name : null);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "relative flex aspect-square min-h-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg p-1 text-fg",
        "transition-transform duration-100 ease-standard active:scale-[.97] motion-reduce:active:scale-100",
        selected ? "border-[1.5px] border-accent-text bg-done-surface" : "border border-border bg-surface hover:bg-surface-3",
        className,
      )}
    >
      {selected && (
        <span className={cn("absolute grid place-items-center rounded-pill bg-accent text-accent-foreground", sm ? "top-1.5 right-1.5 size-[18px]" : "top-2 right-2 size-5")}>
          <Icon icon={Check} size={sm ? 11 : 12} />
        </span>
      )}
      <span className={cn("grid place-items-center overflow-hidden", sm ? "size-14 rounded-[10px]" : "size-[72px] rounded-md")}>
        {muscle ? (
          <MuscleIcon muscle={muscle} zoom size={sm ? 56 : 72} animate={selected ? "loop" : "none"} label="" />
        ) : (
          <Icon icon={icon} size={sm ? 28 : 34} className={selected ? "text-accent-text" : "text-fg-secondary"} />
        )}
      </span>
      <span className={cn("text-center whitespace-nowrap", sm ? "text-xs leading-[15px]" : "text-[13px] leading-4", selected ? "font-bold text-accent-text" : "font-semibold text-fg-secondary")}>{name}</span>
    </button>
  );
}
