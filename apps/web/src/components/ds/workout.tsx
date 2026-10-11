"use client";

import { useState } from "react";
import { Check, ChevronDown, Dumbbell, Minus, Pause, Play, Plus, SkipForward, NotepadText, Timer, type LucideIcon } from "lucide-react";
import { formatClock, formatNumber, isLoadRecord, MINUS_SIGN, type SetType } from "@guf/core";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";
import { PRBadge, SET_TYPE_META } from "./display";

/** Colunas da linha de série: tipo · anterior · kg · reps · concluir. */
const SET_GRID = "grid grid-cols-[40px_minmax(0,1fr)_72px_60px_52px] gap-1.5";

const SET_TYPE_ORDER: SetType[] = ["normal", "warmup", "dropset", "failure"];

const fmtCell = (v: number | null | undefined) => (typeof v === "number" ? formatNumber(v) : "—");

export interface SetFieldState {
  key: "kg" | "reps";
  state: "editing" | "error";
}

export interface SetRowProps {
  type?: SetType;
  /** Número exibido nas séries normais. */
  number?: number;
  previous?: string;
  weightKg?: number | null;
  reps?: number | null;
  done?: boolean;
  pr?: boolean;
  /** Anima o check ("pop") logo após concluir. */
  pop?: boolean;
  field?: SetFieldState;
  onToggle?: () => void;
  onCycleType?: () => void;
  onEditField?: (key: "kg" | "reps") => void;
}

export function SetRow({
  type = "normal",
  number = 1,
  previous = "—",
  weightKg,
  reps,
  done = false,
  pr = false,
  pop = false,
  field,
  onToggle,
  onCycleType,
  onEditField,
}: SetRowProps) {
  const meta = SET_TYPE_META[type];
  const label = type === "normal" ? String(number) : meta.letter;

  const cell = (key: "kg" | "reps", value: number | null | undefined) => {
    const state = field?.key === key ? field.state : null;
    return (
      <button
        type="button"
        onClick={() => onEditField?.(key)}
        aria-label={key === "kg" ? "Carga" : "Repetições"}
        className={cn(
          "grid h-12 cursor-pointer place-items-center rounded-[10px] bg-surface-3 font-display text-[22px] font-semibold text-fg tabular-nums",
          state === "editing" && "border-[1.5px] border-focus",
          state === "error" && "border-[1.5px] border-danger",
        )}
      >
        {fmtCell(value)}
      </button>
    );
  };

  return (
    <div
      className={cn(
        SET_GRID,
        "items-center px-3 py-1 transition-colors duration-200 ease-standard",
        done ? (pr ? "bg-pr/12" : "bg-accent/10") : "bg-transparent",
      )}
    >
      <button
        type="button"
        aria-label={`Tipo: ${meta.label}. Toque para alterar`}
        onClick={onCycleType}
        className={cn("h-11 cursor-pointer rounded-sm bg-transparent font-display text-xl font-bold", meta.text)}
      >
        {label}
      </button>
      <span className="flex items-center gap-1.5 overflow-hidden text-sm whitespace-nowrap text-fg-muted tabular-nums">
        {previous}
        {pr && <PRBadge size="sm" animate />}
      </span>
      {cell("kg", weightKg)}
      {cell("reps", reps)}
      <button
        type="button"
        aria-label={`${done ? "Desmarcar" : "Concluir"} série ${number}`}
        aria-pressed={done}
        onClick={onToggle}
        className={cn(
          "grid h-12 w-[52px] cursor-pointer place-items-center rounded-md",
          done ? (pr ? "bg-pr text-accent-foreground" : "bg-accent text-accent-foreground") : "bg-surface-3 text-fg-muted",
        )}
      >
        <Icon icon={Check} size={22} className={pop ? "animate-guf-pop" : undefined} />
      </button>
    </div>
  );
}

/** Cabeçalho das colunas de série; `unit` segue a unidade do usuário (o banco guarda kg). */
export function SetRowHeader({ unit = "kg" }: { unit?: "kg" | "lb" }) {
  return (
    <div
      className={cn(
        SET_GRID,
        "px-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-fg-muted uppercase",
      )}
    >
      <span className="text-center">Série</span>
      <span>Anterior</span>
      <span className="text-center">{unit}</span>
      <span className="text-center">Reps</span>
      <span />
    </div>
  );
}

export interface ExerciseSet {
  type: SetType;
  previous: string;
  weightKg: number | null;
  reps: number | null;
  done: boolean;
}

export interface ExerciseCardProps {
  name: string;
  tags?: string[];
  /** Descanso formatado ("1:30"). */
  rest?: string;
  icon?: LucideIcon;
  sets?: ExerciseSet[];
  /** Maior carga anterior do exercício; nulo = primeira vez (não gera PR). */
  bestKg?: number | null;
  defaultExpanded?: boolean;
  onSetToggle?: (index: number, set: ExerciseSet, isRecord: boolean) => void;
  onNameClick?: () => void;
  className?: string;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Alguns navegadores bloqueiam vibração sem interação; ignorar.
  }
}

/** Card de exercício no treino: cabeçalho, linhas de série e "Adicionar série". */
export function ExerciseCard({
  name,
  tags = [],
  rest,
  icon = Dumbbell,
  sets: initialSets = [],
  bestKg = null,
  defaultExpanded = true,
  onSetToggle,
  onNameClick,
  className,
}: ExerciseCardProps) {
  const [sets, setSets] = useState(initialSets);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [justDone, setJustDone] = useState(-1);

  const isRecord = (s: ExerciseSet) => isLoadRecord({ setType: s.type, weightKg: s.weightKg, done: s.done }, bestKg);

  const toggle = (i: number) => {
    const current = sets[i];
    if (!current) return;
    const next = { ...current, done: !current.done };
    setSets(sets.map((s, idx) => (idx === i ? next : s)));
    setJustDone(next.done ? i : -1);
    const record = isRecord(next);
    // Háptico: 15ms ao concluir série, [20,40,20] no PR
    if (next.done) vibrate(record ? [20, 40, 20] : 15);
    onSetToggle?.(i, next, record);
  };

  const cycleType = (i: number) => {
    setSets(
      sets.map((s, idx) =>
        idx === i
          ? { ...s, type: SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(s.type) + 1) % SET_TYPE_ORDER.length] ?? "normal" }
          : s,
      ),
    );
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([
      ...sets,
      { type: "normal", previous: "—", weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 0, done: false },
    ]);
  };

  let normalCount = 0;
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-border bg-surface-elevated", className)}>
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={icon} size={20} />
        </div>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <button
            type="button"
            onClick={onNameClick}
            className="cursor-pointer bg-transparent p-0 text-left text-[17px] font-semibold text-fg"
          >
            {name}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex h-6 items-center rounded-sm bg-surface-3 px-2 text-xs font-medium text-fg-secondary">
                {t}
              </span>
            ))}
            {rest && (
              <span className="flex h-6 items-center gap-1 px-2 text-xs font-medium text-fg-muted">
                <Icon icon={Timer} size={13} />
                {rest}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Recolher exercício" : "Expandir exercício"}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="-mt-1.5 -mr-2 grid size-11 cursor-pointer place-items-center rounded-md bg-transparent text-fg-secondary"
        >
          <Icon
            icon={ChevronDown}
            size={20}
            className={cn("transition-transform duration-200 ease-standard", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded && (
        <>
          <SetRowHeader />
          {sets.map((s, i) => {
            if (s.type === "normal") normalCount++;
            return (
              <SetRow
                key={i}
                type={s.type}
                number={normalCount}
                previous={s.previous}
                weightKg={s.weightKg}
                reps={s.reps}
                done={s.done}
                pr={isRecord(s)}
                pop={justDone === i}
                onToggle={() => toggle(i)}
                onCycleType={() => cycleType(i)}
              />
            );
          })}
          <div className="flex gap-2 px-3 pt-2.5 pb-3.5">
            <button
              type="button"
              onClick={addSet}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-surface-3 text-sm font-semibold text-fg"
            >
              <Icon icon={Plus} size={16} />
              Adicionar série
            </button>
            <button
              type="button"
              aria-label="Observação"
              className="grid size-11 cursor-pointer place-items-center rounded-md bg-surface-3 text-fg-secondary"
            >
              <Icon icon={NotepadText} size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export interface StepperProps {
  label?: string;
  value?: number;
  defaultValue?: number;
  step?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  className?: string;
}

/** Stepper numérico de treino (64px de altura, número em Barlow 34px). */
export function Stepper({
  label,
  value,
  defaultValue = 0,
  step = 1,
  min = 0,
  max,
  onChange,
  decreaseLabel = "Diminuir",
  increaseLabel = "Aumentar",
  className,
}: StepperProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const set = (n: number) => {
    const clamped = Math.max(min, max !== undefined ? Math.min(max, n) : n);
    setInner(clamped);
    onChange?.(clamped);
  };
  const btn = "grid h-16 cursor-pointer place-items-center bg-transparent text-fg";
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && <span className="text-[11px] font-semibold tracking-[0.08em] text-fg-muted uppercase">{label}</span>}
      <div className="grid h-16 grid-cols-[48px_1fr_48px] items-center overflow-hidden rounded-md bg-surface-3">
        <button type="button" aria-label={decreaseLabel} onClick={() => set(current - step)} className={btn}>
          <Icon icon={Minus} size={20} />
        </button>
        <span aria-live="polite" className="text-center font-display text-[34px] font-semibold tabular-nums">
          {formatNumber(current)}
        </span>
        <button type="button" aria-label={increaseLabel} onClick={() => set(current + step)} className={btn}>
          <Icon icon={Plus} size={20} />
        </button>
      </div>
    </div>
  );
}

export interface QuickLoadOption {
  delta: number;
  label: string;
}

const QUICK_LOAD_DEFAULTS: QuickLoadOption[] = [
  { delta: -2.5, label: `${MINUS_SIGN}2,5` },
  { delta: 1, label: "+1" },
  { delta: 2.5, label: "+2,5" },
  { delta: 5, label: "+5" },
];

/** Atalhos de carga rápida (±kg). */
export function QuickLoad({
  options = QUICK_LOAD_DEFAULTS,
  onSelect,
  className,
}: {
  options?: QuickLoadOption[];
  onSelect?: (delta: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid auto-cols-fr grid-flow-col gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onSelect?.(o.delta)}
          className="h-12 cursor-pointer rounded-pill border border-border-strong bg-transparent font-display text-xl font-semibold text-fg tabular-nums"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"] as const;

export interface NumericKeypadProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  unit?: string;
  label?: string;
  maxLength?: number;
  className?: string;
}

/** Teclado numérico grande (teclas de 56px) com vírgula decimal. */
export function NumericKeypad({
  value,
  defaultValue = "",
  onChange,
  unit = "kg",
  label = "Teclado numérico",
  maxLength = 5,
  className,
}: NumericKeypadProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const press = (key: (typeof KEYPAD_KEYS)[number]) => {
    let next = current;
    if (key === "⌫") next = next.slice(0, -1);
    else if (key === ",") {
      if (!next.includes(",")) next = (next || "0") + ",";
    } else if (next.length < maxLength) next = (next === "0" ? "" : next) + key;
    setInner(next);
    onChange?.(next);
  };
  return (
    <div className={cn("grid gap-2 rounded-lg border border-border bg-surface-elevated p-3", className)}>
      <div className="flex items-baseline justify-between px-2 py-1">
        <span className="text-[13px] text-fg-secondary">{label}</span>
        <span className="font-display text-4xl font-semibold tabular-nums" aria-live="polite">
          {current || "0"}
          <span className="text-lg text-fg-muted"> {unit}</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {KEYPAD_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={k === "⌫" ? "Apagar" : k === "," ? "Vírgula" : k}
            onClick={() => press(k)}
            className="grid h-14 cursor-pointer place-items-center rounded-md bg-surface-3 font-display text-[26px] font-semibold text-fg active:bg-surface-elevated"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

const RING_CIRCUMFERENCE = 552.92; // 2π × 88

export interface RestTimerProps {
  remaining?: number;
  total?: number;
  running?: boolean;
  onToggle?: () => void;
  onMinus?: () => void;
  onPlus?: () => void;
  onSkip?: () => void;
  className?: string;
}

/** Timer de descanso em tela cheia: anel (mesmo desenho do logo), −15s / play / +15s. */
export function RestTimer({
  remaining = 90,
  total = 90,
  running = false,
  onToggle,
  onMinus,
  onPlus,
  onSkip,
  className,
}: RestTimerProps) {
  const frac = total ? remaining / total : 0;
  const endingSoon = remaining <= 3 && remaining > 0;
  const side = "h-14 cursor-pointer rounded-md bg-surface-3 font-display text-[22px] font-semibold text-fg";
  return (
    <div className={cn("grid justify-items-center gap-4", className)}>
      <div className="relative size-[220px]">
        <svg viewBox="0 0 200 200" width="220" height="220" className="-rotate-90" aria-hidden="true">
          <circle cx="100" cy="100" r="88" strokeWidth="12" className="fill-none stroke-surface-3" />
          <circle
            cx="100"
            cy="100"
            r="88"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={(RING_CIRCUMFERENCE * (1 - frac)).toFixed(2)}
            className={cn(
              "fill-none transition-[stroke-dashoffset] duration-1000 ease-linear",
              endingSoon ? "stroke-warning" : "stroke-accent",
            )}
          />
        </svg>
        <div aria-live="polite" className="absolute inset-0 grid place-items-center content-center gap-0.5">
          <span className="text-xs font-semibold tracking-[0.08em] text-fg-muted uppercase">Descanso</span>
          <span className="font-display text-[60px] leading-none font-semibold tabular-nums">{formatClock(remaining)}</span>
          <span className="text-[13px] text-fg-muted tabular-nums">de {formatClock(total)}</span>
        </div>
      </div>
      <div className="grid w-full max-w-[340px] grid-cols-3 gap-2">
        <button type="button" onClick={onMinus} className={side}>
          {MINUS_SIGN}15s
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={running ? "Pausar" : "Iniciar"}
          className="grid h-14 cursor-pointer place-items-center rounded-md bg-accent text-accent-foreground active:bg-accent-pressed"
        >
          <Icon icon={running ? Pause : Play} size={24} />
        </button>
        <button type="button" onClick={onPlus} className={side}>
          +15s
        </button>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="flex h-11 cursor-pointer items-center gap-1.5 rounded-md bg-transparent px-4 text-sm font-semibold text-fg-secondary"
      >
        <Icon icon={SkipForward} size={16} />
        Pular descanso
      </button>
    </div>
  );
}

export interface RestTimerBarProps {
  remaining?: number;
  total?: number;
  /** Próxima série, ex.: "Próx.: Supino 82,5 × 8". */
  next?: string;
  onAdd?: () => void;
  onSkip?: () => void;
  onClick?: () => void;
  className?: string;
}

/** Barra flutuante do descanso (acima da bottom nav), com progresso de 3px. */
export function RestTimerBar({ remaining = 62, total = 90, next, onAdd, onSkip, onClick, className }: RestTimerBarProps) {
  const pct = total ? (remaining / total) * 100 : 0;
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex h-16 w-full items-center gap-3 overflow-hidden rounded-lg border border-border-strong",
        "bg-surface-elevated pr-2 pl-3 shadow-e3",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <span
        className="absolute bottom-0 left-0 h-[3px] bg-accent transition-[width] duration-1000 ease-linear"
        style={{ width: `${pct.toFixed(1)}%` }}
      />
      <Icon icon={Timer} size={20} className="text-accent-text" />
      <span className="font-display text-[28px] font-semibold tabular-nums">{formatClock(remaining)}</span>
      <span className="flex-1 truncate text-[13px] text-fg-muted">{next}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd?.();
        }}
        className="h-11 cursor-pointer rounded-[10px] bg-surface-3 px-2.5 text-sm font-semibold text-fg"
      >
        +15s
      </button>
      <button
        type="button"
        aria-label="Pular descanso"
        onClick={(e) => {
          e.stopPropagation();
          onSkip?.();
        }}
        className="grid size-11 cursor-pointer place-items-center rounded-[10px] bg-surface-3 text-fg"
      >
        <Icon icon={SkipForward} size={16} />
      </button>
    </div>
  );
}
