"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AlarmClock,
  CalendarDays,
  Check,
  CircleAlert,
  CircleX,
  Droplet,
  Dumbbell,
  Flag,
  Footprints,
  Hand,
  Info,
  Lightbulb,
  Lock,
  PartyPopper,
  RefreshCw,
  SearchX,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Utensils,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../helpers/class-names";
import { StreakFlame } from "./streak-flame";

/*
 * GufRat — mascote "Guf Rat Forte v2" (Claude Design). Rato sempre branco, regata volt;
 * no tema claro ganha contorno escuro (tokens --rat-* por tema, então funciona dentro de
 * seções com outro data-theme, como os stories). 34 ocasiões, cada uma com pose, olhos,
 * boca, acessórios e animação em loop (keyframes guf-rat-* em base.css).
 * Movimento reduzido: tudo parado (regra .guf-rat em base.css). `animated={false}` = versão estática.
 * Origem, duração e atraso de cada parte animada vêm dos dados da pose (estilo inline por isso).
 */

type Point = readonly [number, number];
type PoseName = "down" | "hips" | "flex" | "up" | "shrug" | "press" | "squat" | "hold" | "cross" | "think" | "curl" | "point";
type Eyes = "open" | "lookup" | "lookdown" | "wide" | "happy" | "closed" | "x" | "star" | "shades" | "wink" | "squeeze";
type Mouth = "smile" | "big" | "smirk" | "flat" | "frown" | "wavy" | "o" | "bigo" | "grit";
type Brows = "worried" | "angry" | "raised" | "up";
type Prop =
  | "glow"
  | "confetti"
  | "zzz"
  | "question"
  | "dots"
  | "marks"
  | "trophy"
  | "shaker"
  | "medal"
  | "drop"
  | "drop2"
  | "tear"
  | "bottle"
  | "barbellTop"
  | "barbellBack";
type BodyAnim = "bob" | "bobFast" | "bobSlow" | "jump" | "shake" | "tilt" | "tiltSlow" | "breathe" | "ring" | "squat";
export type GufRatTone = "success" | "danger" | "warning" | "info" | "pr" | "accent" | "muted" | "data";

/** [ombro, cotovelo, mão, braço atrás do corpo?] na grade 160 (lado esquerdo; o direito é espelhado). */
const POSE: Record<PoseName, readonly [Point, Point, Point, boolean?]> = {
  down: [
    [40, 82],
    [34, 104],
    [38, 126],
  ],
  hips: [[40, 82], [24, 100], [52, 114], true],
  flex: [
    [40, 80],
    [18, 80],
    [20, 54],
  ],
  up: [
    [40, 78],
    [30, 50],
    [28, 22],
  ],
  shrug: [
    [40, 82],
    [22, 98],
    [16, 80],
  ],
  press: [
    [40, 78],
    [24, 54],
    [32, 22],
  ],
  squat: [
    [40, 82],
    [24, 94],
    [36, 64],
  ],
  hold: [[40, 82], [44, 108], [68, 100], true],
  cross: [[40, 82], [36, 104], [100, 100], true],
  think: [[40, 82], [46, 108], [72, 68], true],
  curl: [
    [40, 82],
    [36, 108],
    [30, 84],
  ],
  point: [
    [40, 80],
    [28, 56],
    [30, 28],
  ],
};

const BODY_ANIM: Record<BodyAnim, readonly [string, number]> = {
  bob: ["guf-rat-bob", 2.4],
  bobFast: ["guf-rat-bob", 1.1],
  bobSlow: ["guf-rat-bob", 3.6],
  jump: ["guf-rat-jump", 1.1],
  shake: ["guf-rat-shake", 1.6],
  tilt: ["guf-rat-tilt", 3],
  tiltSlow: ["guf-rat-tilt", 4.5],
  breathe: ["guf-rat-breathe", 3.2],
  ring: ["guf-rat-ring", 1.4],
  squat: ["guf-rat-squat", 1.6],
};

interface RatSpec {
  name: string;
  use: string;
  /** Ícone do selo (ou letra do tipo de série). */
  badge: LucideIcon | "flame" | "A" | "D" | "F" | null;
  tone: GufRatTone;
  anim: BodyAnim | null;
  eyes: Eyes;
  mouth: Mouth;
  brows?: Brows;
  arms: PoseName | readonly [PoseName, PoseName];
  props?: readonly Prop[];
  blush?: boolean;
  pump?: boolean;
  wave?: boolean;
  curl?: boolean;
}

/** As 30 ocasiões do design (ids 3a–3ad no Claude Design) + 4 poses das comparações de peso, agrupadas como lá. */
export const GUF_RAT_SPECS = {
  // Sucesso e conquistas
  saved: {
    name: "Salvo",
    use: "Confirmação de ação concluída",
    badge: Check,
    tone: "success",
    anim: "bob",
    eyes: "happy",
    mouth: "smile",
    arms: "hips",
    blush: true,
  },
  workoutDone: {
    name: "Treino concluído",
    use: "Fim do treino, tela de resumo",
    badge: PartyPopper,
    tone: "success",
    anim: "jump",
    eyes: "happy",
    mouth: "big",
    arms: "up",
    props: ["confetti"],
  },
  personalRecord: {
    name: "Recorde pessoal",
    use: "Novo PR em um exercício",
    badge: Trophy,
    tone: "pr",
    anim: "jump",
    eyes: "star",
    mouth: "big",
    arms: "flex",
    pump: true,
    props: ["glow"],
  },
  goalReached: {
    name: "Meta atingida",
    use: "Meta semanal ou mensal cumprida",
    badge: Target,
    tone: "accent",
    anim: "bob",
    eyes: "happy",
    mouth: "smirk",
    arms: "hips",
    props: ["medal"],
  },
  streak: {
    name: "Sequência",
    use: "Semanas seguidas treinando",
    badge: "flame",
    tone: "accent",
    anim: "bobFast",
    eyes: "shades",
    mouth: "smirk",
    arms: "flex",
    pump: true,
  },
  loadUp: {
    name: "Carga subiu",
    use: "Progressão de carga detectada",
    badge: TrendingUp,
    tone: "success",
    anim: null,
    eyes: "open",
    brows: "angry",
    mouth: "smile",
    arms: "press",
    props: ["barbellTop"],
  },
  projectDone: {
    name: "Projeto concluído",
    use: "Fim de um programa de treino",
    badge: Flag,
    tone: "pr",
    anim: "jump",
    eyes: "happy",
    mouth: "big",
    arms: "hold",
    props: ["glow", "trophy"],
  },
  synced: {
    name: "Sincronizado",
    use: "Dados enviados após ficar offline",
    badge: RefreshCw,
    tone: "success",
    anim: "bob",
    eyes: "shades",
    mouth: "smirk",
    arms: "cross",
  },
  // Falha e alertas
  error: {
    name: "Erro",
    use: "Falha ao salvar ou carregar",
    badge: CircleAlert,
    tone: "danger",
    anim: "shake",
    eyes: "x",
    mouth: "wavy",
    arms: "down",
  },
  offline: {
    name: "Sem conexão",
    use: "Offline, dados no aparelho",
    badge: WifiOff,
    tone: "warning",
    anim: "bobSlow",
    eyes: "open",
    brows: "worried",
    mouth: "flat",
    arms: "hips",
    props: ["drop"],
  },
  warning: {
    name: "Atenção",
    use: "Algo pendente antes de seguir",
    badge: TriangleAlert,
    tone: "warning",
    anim: "tilt",
    eyes: "open",
    brows: "raised",
    mouth: "flat",
    arms: "cross",
  },
  confirmDelete: {
    name: "Confirmar exclusão",
    use: "Ação destrutiva, pede confirmação",
    badge: Trash2,
    tone: "danger",
    anim: "shake",
    eyes: "wide",
    brows: "worried",
    mouth: "o",
    arms: "shrug",
    props: ["drop"],
  },
  failure: {
    name: "Na falha",
    use: "Série levada até a falha",
    badge: "F",
    tone: "danger",
    anim: "shake",
    eyes: "squeeze",
    brows: "angry",
    mouth: "grit",
    arms: "press",
    props: ["barbellTop", "drop", "drop2"],
  },
  invalidField: {
    name: "Campo inválido",
    use: "Dado faltando ou incorreto",
    badge: CircleX,
    tone: "danger",
    anim: "tiltSlow",
    eyes: "open",
    brows: "raised",
    mouth: "smirk",
    arms: ["down", "think"],
  },
  sessionExpired: {
    name: "Sessão expirada",
    use: "Precisa entrar de novo",
    badge: Lock,
    tone: "warning",
    anim: "bobSlow",
    eyes: "closed",
    brows: "worried",
    mouth: "flat",
    arms: "down",
  },
  notFound: {
    name: "Página não encontrada",
    use: "Erro 404",
    badge: SearchX,
    tone: "muted",
    anim: "tilt",
    eyes: "lookup",
    mouth: "o",
    arms: "shrug",
    props: ["question"],
  },
  // Informativos
  info: {
    name: "Informativo",
    use: "Explicação neutra de recurso",
    badge: Info,
    tone: "info",
    anim: "bob",
    eyes: "open",
    mouth: "smile",
    arms: "hips",
  },
  tip: {
    name: "Dica",
    use: "Atalho ou boa prática",
    badge: Lightbulb,
    tone: "info",
    anim: "bob",
    eyes: "wink",
    mouth: "smirk",
    arms: ["hips", "point"],
  },
  thinking: {
    name: "Pensando",
    use: "Processamento curto em andamento",
    badge: null,
    tone: "info",
    anim: "tiltSlow",
    eyes: "lookup",
    mouth: "flat",
    arms: ["down", "think"],
    props: ["dots"],
  },
  hydration: {
    name: "Hidratação",
    use: "Lembrete durante o treino",
    badge: Droplet,
    tone: "info",
    anim: "bob",
    eyes: "open",
    mouth: "smile",
    arms: ["hips", "flex"],
    props: ["bottle"],
  },
  postWorkout: {
    name: "Pós-treino",
    use: "Lembrete de refeição",
    badge: Utensils,
    tone: "info",
    anim: "bob",
    eyes: "happy",
    mouth: "smile",
    arms: "hold",
    props: ["shaker"],
  },
  welcome: {
    name: "Boas-vindas",
    use: "Primeiro acesso, onboarding",
    badge: Hand,
    tone: "accent",
    anim: "bob",
    eyes: "open",
    mouth: "smile",
    arms: ["hips", "up"],
    wave: true,
    blush: true,
  },
  news: {
    name: "Novidade",
    use: "Recurso novo ou atualização",
    badge: Sparkles,
    tone: "info",
    anim: "bob",
    eyes: "wide",
    mouth: "smile",
    arms: ["hips", "point"],
  },
  // Treino e estados
  rest: {
    name: "Descanso",
    use: "Timer de descanso rodando",
    badge: Timer,
    tone: "info",
    anim: "breathe",
    eyes: "closed",
    mouth: "o",
    arms: "cross",
    props: ["zzz"],
  },
  restOver: {
    name: "Descanso encerrado",
    use: "Timer zerou, hora da série",
    badge: AlarmClock,
    tone: "accent",
    anim: "ring",
    eyes: "wide",
    brows: "up",
    mouth: "bigo",
    arms: "flex",
    props: ["marks"],
  },
  warmup: {
    name: "Aquecimento",
    use: "Séries de aquecimento",
    badge: "A",
    tone: "warning",
    anim: "tilt",
    eyes: "happy",
    mouth: "smile",
    arms: "up",
  },
  dropSet: {
    name: "Drop set",
    use: "Reduzir carga e seguir",
    badge: "D",
    tone: "data",
    anim: null,
    eyes: "open",
    brows: "angry",
    mouth: "grit",
    arms: ["hips", "curl"],
    curl: true,
  },
  legDay: {
    name: "Dia de perna",
    use: "Rotina do dia é de pernas",
    badge: Footprints,
    tone: "accent",
    anim: "squat",
    eyes: "open",
    brows: "angry",
    mouth: "flat",
    arms: "squat",
    props: ["barbellBack"],
  },
  empty: {
    name: "Estado vazio",
    use: "Lista sem itens ainda",
    badge: Dumbbell,
    tone: "muted",
    anim: "tilt",
    eyes: "lookdown",
    mouth: "flat",
    arms: "shrug",
  },
  missYou: {
    name: "Saudade",
    use: "Dias sem treinar",
    badge: CalendarDays,
    tone: "muted",
    anim: "bobSlow",
    eyes: "open",
    brows: "worried",
    mouth: "frown",
    arms: "down",
    props: ["tear"],
  },
  // Comparações de peso (o rato "levanta" o objeto equivalente ao volume)
  liftLight: {
    name: "Levantando leve",
    use: "Comparação de peso até 200 kg",
    badge: Dumbbell,
    tone: "accent",
    anim: "bob",
    eyes: "happy",
    mouth: "big",
    arms: "up",
    blush: true,
  },
  lift: {
    name: "Levantando",
    use: "Comparação de peso até 2 t",
    badge: Dumbbell,
    tone: "accent",
    anim: "shake",
    eyes: "open",
    brows: "angry",
    mouth: "grit",
    arms: "up",
    props: ["drop"],
  },
  liftHeavy: {
    name: "Levantando pesado",
    use: "Comparação de peso até 20 t",
    badge: Dumbbell,
    tone: "accent",
    anim: "shake",
    eyes: "squeeze",
    brows: "angry",
    mouth: "grit",
    arms: "up",
    props: ["drop", "drop2"],
  },
  liftImpossible: {
    name: "Levantando o impossível",
    use: "Comparação de peso acima de 20 t",
    badge: Dumbbell,
    tone: "accent",
    anim: "shake",
    eyes: "squeeze",
    brows: "angry",
    mouth: "grit",
    arms: "up",
    props: ["drop", "drop2", "marks"],
  },
} as const satisfies Record<string, RatSpec>;

export type GufRatOccasion = keyof typeof GUF_RAT_SPECS;

/** Grupos do design (vitrine e documentação). */
export const GUF_RAT_GROUPS: ReadonlyArray<{ title: string; occasions: readonly GufRatOccasion[] }> = [
  {
    title: "Sucesso e conquistas",
    occasions: ["saved", "workoutDone", "personalRecord", "goalReached", "streak", "loadUp", "projectDone", "synced"],
  },
  {
    title: "Falha e alertas",
    occasions: ["error", "offline", "warning", "confirmDelete", "failure", "invalidField", "sessionExpired", "notFound"],
  },
  { title: "Informativos", occasions: ["info", "tip", "thinking", "hydration", "postWorkout", "welcome", "news"] },
  { title: "Treino e estados", occasions: ["rest", "restOver", "warmup", "dropSet", "legDay", "empty", "missYou"] },
  { title: "Comparações de peso", occasions: ["liftLight", "lift", "liftHeavy", "liftImpossible"] },
];

const BADGE_TONE: Record<GufRatTone, string> = {
  success: "bg-success/16 text-success",
  danger: "bg-danger/16 text-danger",
  warning: "bg-warning/16 text-warning",
  info: "bg-info/16 text-info",
  pr: "bg-pr/16 text-pr-text shadow-pr-glow",
  accent: "bg-accent/16 text-accent-text",
  muted: "bg-surface-3 text-fg-muted",
  data: "bg-data/16 text-data",
};

const INK = "fill-rat-ink";
const FUR = "fill-rat-fur";
const LINE = { fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", className: "stroke-rat-ink" } as const;

/** Desenho do rato (viewBox 0 0 160 160). */
function RatArt({ spec, animated }: { spec: RatSpec; animated: boolean }) {
  // Animação de uma parte: origem na grade do desenho, em loop.
  const A = (name: string, dur: number, origin: string, delay = 0, ease = "cubic-bezier(.2,0,0,1)"): CSSProperties | undefined =>
    animated ? { transformBox: "view-box", transformOrigin: origin, animation: `${name} ${dur}s ${ease} ${delay}s infinite` } : undefined;
  const props = spec.props ?? [];
  const has = (p: Prop) => props.includes(p);
  let k = 0;
  const key = () => `p${k++}`;

  const bell = (x: number, y: number) => (
    <g key={key()}>
      <rect x={x - 12} y={y - 2} width={24} height={4} rx={2} className="fill-fg-muted" />
      <rect x={x - 15} y={y - 8} width={6} height={16} rx={2} className="fill-fg-secondary" />
      <rect x={x + 9} y={y - 8} width={6} height={16} rx={2} className="fill-fg-secondary" />
    </g>
  );
  const barbell = (y: number) => (
    <g key={key()}>
      <rect x={6} y={y - 2} width={148} height={4} rx={2} className="fill-fg-muted" />
      <rect x={10} y={y - 13} width={8} height={26} rx={2} className="fill-fg-secondary" />
      <rect x={19} y={y - 9} width={5} height={18} rx={2} className="fill-fg-secondary" />
      <rect x={142} y={y - 13} width={8} height={26} rx={2} className="fill-fg-secondary" />
      <rect x={136} y={y - 9} width={5} height={18} rx={2} className="fill-fg-secondary" />
    </g>
  );
  // Segmento do braço: desenhado na horizontal e girado do ponto a até b.
  const seg = (
    a: Point,
    b: Point,
    side: "L" | "R",
    d: string,
    extra: {
      className?: string;
      fill?: string;
      stroke?: string;
      strokeOpacity?: number;
      strokeWidth?: number;
      strokeLinecap?: "round";
      strokeLinejoin?: "round";
    } = {},
  ) => {
    const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    return (
      <path
        key={key()}
        d={d}
        transform={`translate(${a[0]} ${a[1]}) rotate(${deg.toFixed(1)}) scale(1 ${side === "R" ? -1 : 1})`}
        {...extra}
        className={extra.className ?? FUR}
      />
    );
  };
  const arm = (side: "L" | "R", name: PoseName): ReactNode[] => {
    const p = POSE[name];
    const m = ([x, y]: Point): Point => (side === "R" ? [160 - x, y] : [x, y]);
    const s = m(p[0]);
    const e = m(p[1]);
    const f = m(p[2]);
    const Lu = Math.hypot(e[0] - s[0], e[1] - s[1]);
    const Lf = Math.hypot(f[0] - e[0], f[1] - e[1]);
    const bulge = name === "flex" || name === "curl" ? 16 : 12;
    const upper = `M0 -10 C${Lu * 0.35} -11.5 ${Lu * 0.7} -10 ${Lu} -7.5 L${Lu} 7.5 C${Lu * 0.72} 11.5 ${Lu * 0.32} ${bulge} 0 10 Z`;
    const fore = `M0 -7.5 C${Lf * 0.25} -9.5 ${Lf * 0.62} -6.2 ${Lf} -5 L${Lf} 5 C${Lf * 0.62} 6 ${Lf * 0.25} 9 0 7.5 Z`;
    const Ld = Math.min(Lu * 0.55, 14);
    const delt = `M-2 -11.5 C7 -13.5 ${Ld} -8 ${Ld + 4} 0 C${Ld} 8 7 13.5 -2 11.5 C-5 7 -5 -7 -2 -11.5 Z`;
    const out: ReactNode[] = [];
    // Braço passando na frente do corpo: contorno para separar do tronco (cor/espessura por tema).
    if (p[3]) {
      out.push(seg(e, f, side, fore, { className: `${FUR} guf-rat-edge`, strokeLinejoin: "round" }));
      out.push(<circle key={key()} cx={f[0]} cy={f[1]} r={10.5} className="guf-rat-edge-dot" />);
    }
    out.push(seg(s, e, side, upper), <circle key={key()} cx={e[0]} cy={e[1]} r={7.5} className={FUR} />, seg(e, f, side, fore));
    out.push(
      seg(s, e, side, `M${Lu * 0.55} 4 Q${Lu * 0.75} 7 ${Lu * 0.92} 5`, {
        fill: "none",
        className: "stroke-rat-ink",
        strokeOpacity: 0.3,
        strokeWidth: 1.3,
        strokeLinecap: "round",
      }),
    );
    out.push(
      seg(s, e, side, delt),
      seg(s, e, side, `M2 -11 C8.5 -12 ${Ld} -7 ${Ld + 3.5} -1`, {
        fill: "none",
        className: "stroke-rat-ink",
        strokeOpacity: 0.32,
        strokeWidth: 1.3,
        strokeLinecap: "round",
      }),
    );
    if (name === "curl" && spec.curl) out.push(bell(f[0], f[1] - 1));
    if (name === "flex" && has("bottle") && side === "R") {
      out.push(
        <g key={key()}>
          <rect x={f[0] - 6} y={f[1] - 30} width={12} height={24} rx={4} className="fill-rat-bottle" />
          <rect x={f[0] - 4} y={f[1] - 35} width={8} height={6} rx={2} className="fill-brand-volt" />
        </g>,
      );
    }
    out.push(<circle key={key()} cx={f[0]} cy={f[1]} r={7.5} className={FUR} />);
    return out;
  };

  const [la, ra] = typeof spec.arms === "string" ? [spec.arms, spec.arms] : spec.arms;
  const L = (
    <g key={key()} style={spec.pump ? A("guf-rat-pump", 1.2, "40px 80px") : undefined}>
      {arm("L", la)}
    </g>
  );
  const R = (
    <g
      key={key()}
      style={
        spec.pump
          ? A("guf-rat-pump", 1.2, "120px 80px", 0.6)
          : spec.wave
            ? A("guf-rat-wave", 1, "120px 78px")
            : spec.curl
              ? A("guf-rat-lift", 1.3, "120px 82px")
              : undefined
      }
    >
      {arm("R", ra)}
    </g>
  );

  const back: ReactNode[] = [];
  const float: ReactNode[] = [];
  const front: ReactNode[] = [];
  const extras: ReactNode[] = [];
  if (has("glow"))
    back.push(<circle key={key()} cx={80} cy={84} r={70} className="fill-pr opacity-25" style={A("guf-rat-pulse", 1.8, "80px 84px")} />);
  if (has("confetti")) {
    const bits: Array<[number, number, string, number]> = [
      [16, 46, "fill-accent", 0],
      [144, 50, "fill-data", 0.3],
      [20, 108, "fill-pr", 0.6],
      [142, 110, "fill-success", 0.15],
      [56, 10, "fill-data", 0.45],
      [106, 8, "fill-accent", 0.75],
    ];
    bits.forEach(([x, y, fill, d], i) =>
      back.push(
        <rect
          key={key()}
          x={x - 3}
          y={y - 5}
          width={6}
          height={10}
          rx={1.5}
          className={fill}
          transform={`rotate(${i * 37} ${x} ${y})`}
          style={A("guf-rat-confetti", 1.4, `${x}px ${y}px`, d)}
        />,
      ),
    );
  }
  const letters = (items: Array<[number, number, number, number]>, char: string, anim: string, dur: number, ease?: string) =>
    items.forEach(([x, y, s, d]) =>
      float.push(
        <text
          key={key()}
          x={x}
          y={y}
          fontSize={s}
          fontWeight={700}
          className="fill-fg-secondary font-display"
          style={A(anim, dur, `${x}px ${y}px`, d, ease)}
        >
          {char}
        </text>,
      ),
    );
  if (has("zzz"))
    letters(
      [
        [106, 26, 13, 0],
        [118, 15, 17, 0.6],
        [131, 5, 21, 1.2],
      ],
      "z",
      "guf-rat-zzz",
      2.4,
      "linear",
    );
  if (has("question"))
    letters(
      [
        [116, 22, 22, 0],
        [134, 12, 16, 0.5],
      ],
      "?",
      "guf-rat-dot",
      1.8,
    );
  if (has("dots"))
    [116, 128, 140].forEach((x, i) =>
      float.push(
        <circle key={key()} cx={x} cy={14} r={4} className="fill-fg-secondary" style={A("guf-rat-dot", 1.2, `${x}px 14px`, i * 0.18)} />,
      ),
    );
  if (has("marks")) {
    float.push(
      <path
        key={key()}
        d="M12 40 Q6 50 12 60 M4 34 Q-4 50 4 66 M148 40 Q154 50 148 60 M156 34 Q164 50 156 66"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        className="stroke-accent-text"
        style={animated ? { animation: "guf-rat-marks .7s linear infinite" } : undefined}
      />,
    );
  }
  if (has("trophy")) {
    front.push(
      <g key={key()}>
        <path
          d="M68 90 C59 90 59 101 69 100 M92 90 C101 90 101 101 91 100"
          fill="none"
          strokeWidth={3.5}
          strokeLinecap="round"
          className="stroke-pr"
        />
        <path d="M68 86 H92 V92 A12 12 0 0 1 68 92 Z" className="fill-pr" />
        <rect x={77} y={102} width={6} height={7} className="fill-pr" />
        <rect x={71} y={108} width={18} height={6} rx={2} className="fill-pr" />
      </g>,
    );
  }
  if (has("shaker")) {
    front.push(
      <g key={key()}>
        <rect x={71} y={78} width={18} height={8} rx={3} className="fill-fg-muted" />
        <rect x={72} y={85} width={16} height={26} rx={4} className="fill-rat-bottle" />
      </g>,
    );
  }
  if (has("medal")) {
    front.push(
      <g key={key()}>
        <path d="M71 76 L80 92 L89 76" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" className="stroke-data" />
        <circle cx={80} cy={98} r={8} className="fill-pr" />
      </g>,
    );
  }
  const drop = (x: number, y: number, d: number) => (
    <path
      key={key()}
      d={`M${x} ${y} C${x + 4} ${y + 6} ${x + 4} ${y + 9} ${x} ${y + 9} C${x - 4} ${y + 9} ${x - 4} ${y + 6} ${x} ${y} Z`}
      className="fill-info"
      style={A("guf-rat-drop", 1.8, `${x}px ${y}px`, d)}
    />
  );
  if (has("drop")) extras.push(drop(110, 34, 0));
  if (has("drop2")) extras.push(drop(50, 40, 0.9));
  if (has("tear")) extras.push(drop(90, 52, 0));

  const ex = 71;
  const ey = 47;
  const fx = 89;
  const eye = (x: number, y: number, t: Eyes | "sqL" | "sqR"): ReactNode => {
    if (t === "open")
      return (
        <g key={key()} style={A("guf-rat-blink", 4, `${x}px ${y}px`)}>
          <circle cx={x} cy={y} r={3.2} className={INK} />
        </g>
      );
    if (t === "lookup" || t === "lookdown")
      return <circle key={key()} cx={x + 0.5} cy={y + (t === "lookup" ? -1.5 : 1.8)} r={3.2} className={INK} />;
    if (t === "wide")
      return (
        <g key={key()}>
          <circle cx={x} cy={y} r={4.4} className={INK} />
          <circle cx={x + 1.4} cy={y - 1.4} r={1.3} className={FUR} />
        </g>
      );
    if (t === "happy") return <path key={key()} d={`M${x - 4} ${y + 1.5} Q${x} ${y - 4} ${x + 4} ${y + 1.5}`} {...LINE} />;
    if (t === "closed") return <path key={key()} d={`M${x - 4} ${y - 1} Q${x} ${y + 3.5} ${x + 4} ${y - 1}`} {...LINE} />;
    if (t === "x")
      return (
        <path key={key()} d={`M${x - 3.5} ${y - 3.5} L${x + 3.5} ${y + 3.5} M${x + 3.5} ${y - 3.5} L${x - 3.5} ${y + 3.5}`} {...LINE} />
      );
    if (t === "sqL") return <path key={key()} d={`M${x - 3.5} ${y - 3.5} L${x + 3} ${y} L${x - 3.5} ${y + 3.5}`} {...LINE} />;
    if (t === "sqR") return <path key={key()} d={`M${x + 3.5} ${y - 3.5} L${x - 3} ${y} L${x + 3.5} ${y + 3.5}`} {...LINE} />;
    if (t === "star") {
      let d = "";
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 2.4 : 5.6;
        d += `${i ? "L" : "M"}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)} `;
      }
      return <path key={key()} d={`${d}Z`} className="fill-pr" />;
    }
    return null;
  };
  let eyes: ReactNode[];
  if (spec.eyes === "shades")
    eyes = [
      <path key={key()} d="M62 44 H98 V46 Q98 52 91.5 52 Q85.5 52 84.5 46.5 H75.5 Q74.5 52 68.5 52 Q62 52 62 46 Z" className={INK} />,
    ];
  else if (spec.eyes === "wink") eyes = [eye(ex, ey, "open"), eye(fx, ey, "happy")];
  else if (spec.eyes === "squeeze") eyes = [eye(ex, ey, "sqL"), eye(fx, ey, "sqR")];
  else eyes = [eye(ex, ey, spec.eyes), eye(fx, ey, spec.eyes)];

  const BROWS: Record<Brows, string> = {
    worried: "M65 43 L75 40 M85 40 L95 43",
    angry: "M65 40 L75 43.5 M85 43.5 L95 40",
    raised: "M66 42 L75 42 M85 40.5 Q90 36.5 95 40.5",
    up: "M65 41.5 Q70 38.5 75 41 M85 41 Q90 38.5 95 41.5",
  };
  const MOUTH: Record<Mouth, ReactNode> = {
    smile: <path d="M74 61 Q80 67 86 61" {...LINE} />,
    big: <path d="M73 60 Q80 72 87 60 Z" strokeWidth={2} strokeLinejoin="round" className="fill-rat-ink stroke-rat-ink" />,
    smirk: <path d="M74 63 Q81 65 86 60" {...LINE} />,
    flat: <path d="M75 63 L85 63" {...LINE} />,
    frown: <path d="M74 65.5 Q80 60 86 65.5" {...LINE} />,
    wavy: <path d="M73 63 q1.75 -2.5 3.5 0 t3.5 0 t3.5 0 t3.5 0" {...LINE} />,
    o: <ellipse cx={80} cy={63.5} rx={2.4} ry={3} className={INK} />,
    bigo: <ellipse cx={80} cy={64} rx={4} ry={5} className={INK} />,
    grit: (
      <>
        <rect x={73} y={60} width={14} height={6.5} rx={2} className={INK} />
        <path d="M73 63.25 H87 M77.7 60 V66.5 M82.3 60 V66.5" strokeWidth={1.1} className="stroke-rat-fur" />
      </>
    ),
  };

  const bodyAnim = spec.anim ? BODY_ANIM[spec.anim] : null;
  const bodyStyle = bodyAnim
    ? A(bodyAnim[0], bodyAnim[1], bodyAnim[0] === "guf-rat-tilt" || bodyAnim[0] === "guf-rat-ring" ? "80px 140px" : "80px 154px")
    : undefined;
  const isPress = la === "press";
  const armsBlock = isPress ? (
    <g style={spec.anim === "shake" ? undefined : A("guf-rat-lift", 1.4, "80px 60px")}>
      {barbell(22)}
      {L}
      {R}
    </g>
  ) : (
    <>
      {L}
      {R}
    </>
  );

  return (
    <>
      {back}
      <g style={bodyStyle}>
        <path
          d="M100 128 C130 132 142 110 128 96"
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          className="stroke-rat-fur"
          style={A("guf-rat-tail", 2.2, "100px 128px")}
        />
        <path
          d="M56 130 H74 L73 140 Q72 147 67 148 H62 Q57 147 57 140 Z M86 130 H104 L103 140 Q103 147 98 148 H93 Q88 147 87 140 Z"
          className={FUR}
        />
        <ellipse cx={64} cy={150} rx={10} ry={4} className={FUR} />
        <ellipse cx={96} cy={150} rx={10} ry={4} className={FUR} />
        <path d="M56 114 L104 114 L108 136 L84 136 L80 128 L76 136 L52 136 Z" className="fill-fg-muted" />
        <path
          d="M42 74 Q80 66 118 74 C126 77 130 84 127 90 C121 100 111 106 105 118 Q80 124 55 118 C49 106 39 100 33 90 C30 84 34 77 42 74 Z"
          className={FUR}
        />
        <path
          d="M38 93 Q46 101 55 106 M122 93 Q114 101 105 106"
          fill="none"
          strokeOpacity={0.3}
          strokeWidth={1.3}
          strokeLinecap="round"
          className="stroke-rat-ink"
        />
        <path
          d="M55 76 L66 75 Q80 92 94 75 L105 76 C104 92 101 104 100 117 Q80 121 60 117 C59 104 56 92 55 76 Z"
          className="fill-brand-volt"
        />
        <path
          d="M63 96 Q72 102 80 97 Q88 102 97 96 M80 100 V113"
          fill="none"
          strokeOpacity={0.3}
          strokeWidth={2}
          strokeLinecap="round"
          className="stroke-accent-foreground"
        />
        {has("barbellBack") && barbell(64)}
        <path d="M65 56 C64 68 56 72 42 75 L118 75 C104 72 96 68 95 56 Z" className={FUR} />
        <circle cx={58} cy={30} r={12} className={FUR} />
        <circle cx={58} cy={30} r={6} className="fill-rat-pink" />
        <circle cx={102} cy={30} r={12} className={FUR} />
        <circle cx={102} cy={30} r={6} className="fill-rat-pink" />
        <ellipse cx={80} cy={48} rx={24} ry={21} className={FUR} />
        <path d="M56 38 Q80 26 104 38 L104 43 Q80 31 56 43 Z" className="fill-brand-volt" />
        <path d="M103 38 L113 33 L112 41 Z M103 41 L113 45 L107 50 Z" className="fill-brand-volt" />
        {spec.blush && (
          <g>
            <ellipse cx={64} cy={56} rx={3.5} ry={2.2} className="fill-rat-pink" />
            <ellipse cx={96} cy={56} rx={3.5} ry={2.2} className="fill-rat-pink" />
          </g>
        )}
        <path
          d="M68 58 L60 56.5 M68 61 L60 62 M92 58 L100 56.5 M92 61 L100 62"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.6}
          className="stroke-rat-ink"
        />
        {MOUTH[spec.mouth]}
        <ellipse cx={80} cy={57} rx={3.6} ry={2.6} className="fill-rat-pink" />
        {eyes}
        {spec.brows && <path d={BROWS[spec.brows]} {...LINE} />}
        {front}
        {armsBlock}
        {extras}
      </g>
      {float}
    </>
  );
}

export interface GufRatProps {
  /** Ocasião (pose, expressão, acessórios e animação). */
  occasion: GufRatOccasion;
  /** false = versão estática (sem loop). Movimento reduzido sempre para. */
  animated?: boolean;
  /** Lado do desenho em px (padrão 168, como no design). */
  size?: number;
  /** Selo da ocasião no canto (ícone ou letra), como nos cards do design. */
  badge?: boolean;
  /** Nome acessível; vazio quando há texto ao lado dizendo o mesmo (decorativo). */
  label?: string | null;
  className?: string;
}

/** Mascote do guf. Ex.: <GufRat occasion="workoutDone" /> no resumo, <GufRat occasion="empty" animated={false} />. */
export function GufRat({ occasion, animated = true, size = 168, badge = false, label, className }: GufRatProps) {
  const spec: RatSpec = GUF_RAT_SPECS[occasion];
  const name = label === undefined ? `Guf Rat – ${spec.name}` : label;
  const art = (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      role={name ? "img" : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
      className={cn("guf-rat guf-rat-svg overflow-visible", !badge && className)}
    >
      <RatArt spec={spec} animated={animated} />
    </svg>
  );
  if (!badge || !spec.badge) return art;
  const Badge = spec.badge;
  return (
    <span className={cn("guf-rat relative inline-flex", className)}>
      {art}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0 right-0 grid size-10 place-items-center rounded-[12px]",
          BADGE_TONE[spec.tone],
          animated && "animate-guf-rat-pop",
        )}
      >
        {typeof Badge === "string" ? (
          Badge === "flame" ? (
            <StreakFlame size={22} />
          ) : (
            <span className="font-display text-[22px] leading-none font-bold">{Badge}</span>
          )
        ) : (
          <Badge size={20} aria-hidden="true" />
        )}
      </span>
    </span>
  );
}
