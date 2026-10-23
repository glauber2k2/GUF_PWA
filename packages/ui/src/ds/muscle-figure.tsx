import type { FigureMuscle, MuscleLevels } from "@guf/core";
import { cn } from "../helpers/class-names";

/*
 * Boneco frente/costas (Claude Design · StoryArt `figure()`), no resumo do treino e nos stories: silhueta em 14% do texto,
 * regiões não treinadas em 22% e as treinadas em volt com 36/64/100% conforme o nível (1–3).
 * Diferente do BodyMap do app (ícone de grupo): aqui várias regiões acendem juntas.
 */

const LEFT: ReadonlyArray<readonly [number, number]> = [
  [46.8, 16],
  [46.6, 20.6],
  [40, 22.6],
  [36, 24],
  [33.6, 26.6],
  [32.6, 30.6],
  [31.6, 38],
  [30.8, 44.6],
  [29.4, 51],
  [28.6, 57],
  [28.2, 61],
  [27.6, 64.6],
  [28.6, 67],
  [30.4, 66.6],
  [31, 63.4],
  [31.6, 59.4],
  [33.4, 52],
  [35.2, 45.6],
  [36.4, 39.8],
  [37.4, 35.4],
  [38, 39.6],
  [39.8, 45.6],
  [40.4, 50.2],
  [38.6, 55],
  [36.8, 60],
  [37, 67],
  [38.2, 74],
  [37.4, 79],
  [37.6, 84],
  [39.2, 92.6],
  [38.2, 96],
  [39.8, 97.6],
  [44.2, 97.6],
  [44.8, 95],
  [44.6, 92],
  [45.6, 84],
  [45.8, 78],
  [46.4, 73.6],
  [47.8, 66],
  [48.8, 61],
  [50, 59.4],
];
const BODY = `M${LEFT.concat(
  LEFT.slice(0, -1)
    .reverse()
    .map(([x, y]) => [100 - x, y] as const),
)
  .map((p) => p.join(" "))
  .join("L")}Z`;

type Region =
  | "delt"
  | "chest"
  | "arm"
  | "triO"
  | "triL"
  | "fore"
  | "abs1"
  | "abs2"
  | "abs3"
  | "quad"
  | "calf"
  | "trap"
  | "lat"
  | "low"
  | "glu"
  | "ham";

/** Caminho da região (lado esquerdo) e se é espelhada para o direito. */
const REGION: Record<Region, readonly [string, boolean]> = {
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

const FRONT: readonly Region[] = ["delt", "chest", "arm", "fore", "abs1", "abs2", "abs3", "quad", "calf"];
const BACK: readonly Region[] = ["trap", "delt", "lat", "low", "triO", "triL", "fore", "glu", "ham", "calf"];

/** Grupo → regiões [frente, costas]. */
const MUSCLE_REGIONS: Record<FigureMuscle, readonly [readonly Region[], readonly Region[]]> = {
  peito: [["chest"], []],
  ombro: [["delt"], ["delt"]],
  costas: [[], ["lat", "low"]],
  trapezio: [[], ["trap"]],
  abdomen: [["abs1", "abs2", "abs3"], []],
  biceps: [["arm"], []],
  triceps: [[], ["triO", "triL"]],
  antebraco: [["fore"], ["fore"]],
  gluteos: [[], ["glu"]],
  quadriceps: [["quad"], []],
  posterior: [[], ["ham"]],
  panturrilha: [["calf"], ["calf"]],
};

/** Opacidade das regiões treinadas por nível (classes fixas para o Tailwind gerar). */
export const MUSCLE_LEVEL_OPACITY = ["", "opacity-36", "opacity-64", "opacity-100"] as const;
const FLIP = "translate(100 0) scale(-1 1)";

function Shape({ region, className }: { region: Region; className: string }) {
  const [d, mirrored] = REGION[region];
  return (
    <g className={className}>
      <path d={d} />
      {mirrored && <path d={d} transform={FLIP} />}
    </g>
  );
}

export function MuscleFigure({ view, height, levels }: { view: "front" | "back"; height: number; levels: MuscleLevels }) {
  const lit = new Map<Region, number>();
  for (const [muscle, level] of Object.entries(levels) as Array<[FigureMuscle, number]>) {
    for (const region of MUSCLE_REGIONS[muscle][view === "front" ? 0 : 1]) lit.set(region, Math.max(lit.get(region) ?? 0, level));
  }
  const regions = view === "front" ? FRONT : BACK;
  const rest = regions.filter((r) => !lit.has(r));
  const hit = regions.filter((r) => lit.has(r)).sort((a, b) => (lit.get(a) ?? 0) - (lit.get(b) ?? 0));
  return (
    <svg width={Math.round(height * 0.52)} height={height} viewBox="24 1 52 98" aria-hidden="true" className="block text-fg">
      <ellipse cx={50} cy={9.6} rx={5.8} ry={7.2} className="fill-current opacity-14" />
      <path d={BODY} strokeWidth={1.6} strokeLinejoin="round" className="fill-current stroke-current opacity-14" />
      {rest.map((r) => (
        <Shape key={r} region={r} className="fill-current opacity-22" />
      ))}
      {hit.map((r) => (
        <Shape key={r} region={r} className={cn("fill-accent-text", MUSCLE_LEVEL_OPACITY[lit.get(r) ?? 1])} />
      ))}
    </svg>
  );
}
