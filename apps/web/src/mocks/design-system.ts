/**
 * DADOS FICTÍCIOS da vitrine do design system (/design-system, só em desenvolvimento).
 * Substituir pelos dados reais do Supabase (packages/api) quando os componentes forem
 * usados nas telas. Nada aqui deve ser importado por telas de produção.
 */
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Copy,
  Dumbbell,
  Ellipsis,
  Eye,
  EyeOff,
  GripVertical,
  House,
  Info,
  LoaderCircle,
  Minus,
  Monitor,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  SkipForward,
  StickyNote,
  Sun,
  Timer,
  Trash2,
  Trophy,
  User,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ExerciseSet } from "@/shared/components/ds/workout";
import { BOTTOM_NAV_ITEMS, type NavItem, type ReorderItem } from "@/shared/components/ds/navigation";
import type { SummaryStat } from "@/shared/components/ds/cards";
import type { VolumeLevel } from "@/shared/components/ds/display";

/* ---------- Fundamentos ---------- */

export type ThemeKey = "dark" | "light";

export const THEMES: Record<ThemeKey, { key: ThemeKey; label: string; icon: LucideIcon; note: string; elevNote: string }> = {
  dark: { key: "dark", label: "escuro", icon: Moon, note: "padrão", elevNote: "Elevação por superfície; sombra só em e3" },
  light: { key: "light", label: "claro", icon: Sun, note: 'data-theme="light"', elevNote: "Sombras suaves em três níveis" },
};

/**
 * Amostras de cor. `token` = variável CSS exibida; `bg` = classe da amostra;
 * `on` = classe do "Aa" sobre a cor. Classes literais para o Tailwind encontrá-las.
 */
export interface ColorSwatch {
  token: string;
  bg: string;
  on: string;
}

export const COLOR_GROUPS: Array<{ name: string; swatches: ColorSwatch[] }> = [
  {
    name: "Fundos e superfícies",
    swatches: [
      { token: "background", bg: "bg-background", on: "text-fg" },
      { token: "surface", bg: "bg-surface", on: "text-fg" },
      { token: "surface-elevated", bg: "bg-surface-elevated", on: "text-fg" },
      { token: "surface-3", bg: "bg-surface-3", on: "text-fg" },
      { token: "border", bg: "bg-border", on: "text-fg" },
      { token: "border-strong", bg: "bg-border-strong", on: "text-fg" },
    ],
  },
  {
    name: "Texto",
    swatches: [
      { token: "text-primary", bg: "bg-fg", on: "text-background" },
      { token: "text-secondary", bg: "bg-fg-secondary", on: "text-background" },
      { token: "text-muted", bg: "bg-fg-muted", on: "text-background" },
    ],
  },
  {
    name: "Marca e foco",
    swatches: [
      { token: "accent", bg: "bg-accent", on: "text-accent-foreground" },
      { token: "accent-foreground", bg: "bg-accent-foreground", on: "text-accent" },
      { token: "accent-text", bg: "bg-accent-text", on: "text-background" },
      { token: "focus", bg: "bg-focus", on: "text-background" },
    ],
  },
  {
    name: "Dados e estados",
    swatches: [
      { token: "data", bg: "bg-data", on: "text-background" },
      { token: "success", bg: "bg-success", on: "text-background" },
      { token: "warning", bg: "bg-warning", on: "text-background" },
      { token: "danger", bg: "bg-danger", on: "text-background" },
      { token: "info", bg: "bg-info", on: "text-background" },
    ],
  },
  {
    name: "Recorde pessoal",
    swatches: [
      { token: "pr", bg: "bg-pr", on: "text-pr-foreground" },
      { token: "pr-foreground", bg: "bg-pr-foreground", on: "text-pr" },
      { token: "pr-text", bg: "bg-pr-text", on: "text-background" },
    ],
  },
];

/** Escala de espaço (grid 4px); `bar` = largura igual ao token (w-n = n × 4px). */
export const SPACES = [
  { n: 1, px: 4, bar: "w-1" },
  { n: 2, px: 8, bar: "w-2" },
  { n: 3, px: 12, bar: "w-3" },
  { n: 4, px: 16, bar: "w-4" },
  { n: 5, px: 20, bar: "w-5" },
  { n: 6, px: 24, bar: "w-6" },
  { n: 8, px: 32, bar: "w-8" },
  { n: 10, px: 40, bar: "w-10" },
  { n: 12, px: 48, bar: "w-12" },
];

export const RADII = [
  { name: "8", radius: "rounded-sm", use: "Chips, tags" },
  { name: "10", radius: "rounded-[10px]", use: "Células de série" },
  { name: "12", radius: "rounded-md", use: "Botões, inputs" },
  { name: "14", radius: "rounded-[14px]", use: "Sheet option, toast" },
  { name: "16", radius: "rounded-lg", use: "Cards" },
  { name: "24", radius: "rounded-xl", use: "Sheet, modal" },
  { name: "pill", radius: "rounded-pill", use: "Segmented, FAB" },
];

export const EASES = [
  { name: "Standard", ease: "ease-standard", curve: "cubic-bezier(.2,0,0,1)" },
  { name: "Enter", ease: "ease-enter", curve: "cubic-bezier(.05,.7,.1,1)" },
  { name: "Exit", ease: "ease-exit", curve: "cubic-bezier(.3,0,.8,.15)" },
  { name: "Overshoot", ease: "ease-overshoot", curve: "cubic-bezier(.34,1.56,.64,1)" },
];

export const DURATIONS = (
  [
    ["instant", 100, "Press, toggles"],
    ["fast", 150, "Hover, fades curtos"],
    ["base", 200, "Check da série, chips"],
    ["moderate", 250, "Cards, banners"],
    ["screen", 300, "Transição de tela, sheet"],
    ["slow", 350, "Modais grandes"],
    ["celebrate", 800, "PR, resumo"],
  ] as const
).map(([name, ms, use]) => ({ name, ms, use, pct: Math.round((ms / 800) * 60) }));

export const TYPE_SCALE = [
  { token: "num-xl", spec: "72/72 · 600", sample: "12.480", className: "font-display text-[72px] leading-[72px] font-semibold tabular-nums" },
  { token: "display", spec: "56/56 · 700", sample: "Recorde pessoal", className: "font-display text-[56px] leading-[56px] font-bold tracking-[-0.01em]" },
  { token: "num-lg", spec: "40/40 · 600", sample: "82,5 kg", className: "font-display text-[40px] leading-10 font-semibold tabular-nums" },
  { token: "num-md", spec: "24/24 · 600", sample: "80 × 10 · 58:12", className: "font-display text-2xl leading-6 font-semibold tabular-nums" },
  { token: "h1", spec: "30/36 · 700", sample: "Resumo da semana", className: "text-[30px] leading-9 font-bold tracking-[-0.02em]" },
  { token: "h2", spec: "22/28 · 600", sample: "Treino A – Peito e Tríceps", className: "text-[22px] leading-7 font-semibold tracking-[-0.015em]" },
  { token: "h3", spec: "18/24 · 600", sample: "Supino reto com barra", className: "text-lg leading-6 font-semibold" },
  { token: "body", spec: "16/24 · 400", sample: "Seu treino é salvo automaticamente.", className: "text-base leading-6" },
  { token: "body-sm", spec: "14/20 · 400", sample: "6 exercícios · ~55 min · Último: há 4 dias", className: "text-sm leading-5 text-fg-secondary" },
  { token: "caption", spec: "12/16 · 500", sample: "Ter, 6 out", className: "text-xs leading-4 font-medium text-fg-muted" },
  { token: "overline", spec: "11/16 · 600", sample: "Recordes pessoais", className: "text-[11px] leading-4 font-semibold tracking-[0.08em] uppercase text-fg-secondary" },
];

export const ICONS: Array<{ name: string; icon: LucideIcon }> = [
  { name: "dumbbell", icon: Dumbbell },
  { name: "timer", icon: Timer },
  { name: "trophy", icon: Trophy },
  { name: "play", icon: Play },
  { name: "pause", icon: Pause },
  { name: "skip-forward", icon: SkipForward },
  { name: "plus", icon: Plus },
  { name: "minus", icon: Minus },
  { name: "check", icon: Check },
  { name: "chevron-down", icon: ChevronDown },
  { name: "ellipsis", icon: Ellipsis },
  { name: "trash-2", icon: Trash2 },
  { name: "sticky-note", icon: StickyNote },
  { name: "grip-vertical", icon: GripVertical },
  { name: "search", icon: Search },
  { name: "eye", icon: Eye },
  { name: "eye-off", icon: EyeOff },
  { name: "circle-alert", icon: CircleAlert },
  { name: "circle-check", icon: CircleCheck },
  { name: "info", icon: Info },
  { name: "wifi-off", icon: WifiOff },
  { name: "loader-circle", icon: LoaderCircle },
  { name: "arrow-up-right", icon: ArrowUpRight },
  { name: "house", icon: House },
  { name: "calendar-days", icon: CalendarDays },
  { name: "book-open", icon: BookOpen },
  { name: "user", icon: User },
  { name: "moon", icon: Moon },
  { name: "sun", icon: Sun },
  { name: "monitor", icon: Monitor },
  { name: "copy", icon: Copy },
];

/* ---------- Formulários ---------- */

export const FORM_DEFAULTS = {
  name: "Marina Souza",
  emailInvalid: "marina@email",
  emailError: "Falta o final do e-mail, como “.com”.",
  password: "Treino2026",
};

export const WEIGHT_UNIT_OPTIONS = [
  { value: "kg", label: "Quilos (kg)" },
  { value: "lb", label: "Libras (lb)" },
];
export const PERIOD_OPTIONS = ["Semana", "Mês", "Ano"];
export const CHART_PERIOD_OPTIONS = ["1M", "3M", "6M", "1A"];
export const METRIC_OPTIONS = ["Carga", "Volume", "1RM est."];
export const THEME_OPTIONS = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Sistema", icon: Monitor },
];

/* ---------- Exibição ---------- */

export const MUSCLE_FILTERS = ["Todos", "Peito", "Costas", "Pernas"];

/** Evolução da carga no supino (kg), jul → out. */
export const CHART_VALUES = [70, 72.5, 72.5, 75, 77.5, 75, 80, 82.5, 80];

/** Outubro de 2026: dia 1 cai numa quinta (startWeekday 4). */
export const CALENDAR = {
  monthLabel: "Outubro 2026",
  monthName: "outubro",
  daysInMonth: 31,
  startWeekday: 4,
  today: 10,
  selected: 6,
  levels: { 1: 2, 2: 3, 4: 1, 6: 3, 7: 2, 9: 3 } satisfies Partial<Record<number, VolumeLevel>>,
};

/* ---------- Cards ---------- */

export const NEXT_ROUTINE = {
  eyebrow: "Próxima",
  title: "Treino A – Peito e Tríceps",
  exercises: "Supino reto, Supino inclinado, Crucifixo, Tríceps corda",
  meta: ["6 exercícios", "~55 min", "Último: há 4 dias"],
};

export const PROJECTS = [
  { title: "Hipertrofia 2026 – ABC", routines: ["A", "B", "C"], meta: "3 rotinas · desde 2 set", status: "active" as const },
  { title: "Força – Upper/Lower", routines: ["U", "L"], meta: "2 rotinas", status: "inactive" as const },
  { title: "Adaptação 2025", routines: [], meta: undefined, status: "archived" as const },
];

export const WORKOUT_SUMMARY: { title: string; date: string; stats: SummaryStat[]; prs: number; delta: string; deltaLabel: string } = {
  title: "Treino A – Peito e Tríceps",
  date: "Ter, 6 out",
  stats: [
    { value: "58:12", label: "Duração" },
    { value: "9.840", label: "Volume kg" },
    { value: "22", label: "Séries" },
  ],
  prs: 2,
  delta: "+6% volume",
  deltaLabel: "vs. semana passada",
};

/* ---------- Treino ---------- */

export const EXERCISE = {
  name: "Supino reto",
  tags: ["Peito", "Barra"],
  rest: "1:30",
  best1RmKg: 80,
  sets: [
    { type: "warmup", previous: "40 × 12", weightKg: 40, reps: 12, done: true },
    { type: "normal", previous: "80 × 10", weightKg: 80, reps: 10, done: true },
    { type: "normal", previous: "80 × 9", weightKg: 82.5, reps: 8, done: false },
    { type: "dropset", previous: "60 × 12", weightKg: 60, reps: 12, done: false },
  ] satisfies ExerciseSet[],
};

export const REST_TIMER = { remaining: 54, total: 90, next: "Próx.: Supino 82,5 × 8" };

/* ---------- Navegação e overlays ---------- */

export const REORDER_ITEMS: ReorderItem[] = [
  { id: "supino-reto", name: "Supino reto", meta: "4 × 8–12" },
  { id: "supino-inclinado", name: "Supino inclinado", meta: "3 × 10" },
  { id: "crucifixo", name: "Crucifixo", meta: "3 × 12" },
];

export const START_SHEET = {
  title: "Iniciar treino",
  subtitle: "Hipertrofia 2026",
  options: [
    { letter: "A", title: "Treino A – Peito e Tríceps", subtitle: "Sugerido · há 4 dias", highlighted: true },
    { letter: "B", title: "Treino B – Costas e Bíceps", subtitle: "há 2 dias", highlighted: false },
  ],
};

/** Menu inferior com alerta na aba Perfil (ex.: pedidos para seguir). */
export const NAV_ITEMS_WITH_BADGE: NavItem[] = BOTTOM_NAV_ITEMS.map((item) =>
  item.label === "Perfil" ? { ...item, badge: { label: "2 solicitações para seguir" } } : item,
);
