// Stories · Telas cheias F01–F10 (Claude Design · StoryArt). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import type { ReactNode } from "react";
import { ArrowRight, Check, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { plural, WEEKDAY_INITIALS } from "@guf/core";
import { GufRat, Logo, MuscleIcon, StreakFlame, type MuscleIconKey } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { MuscleFigure } from "@/shared/components/ds";
import { STORY_DOMAIN, STORY_SIGNATURE_LEAD, type StoryModelProps } from "@/features/share/type";

type Data = StoryModelProps["d"];

/** Legenda: mesma intensidade das regiões do boneco (níveis 1–3). */
const LEVEL_OPACITY = { 1: "opacity-36", 2: "opacity-64", 3: "" } as const;

/** Rótulo do grupo (StoryData) → ícone do músculo. */
const LABEL_ICON: Record<string, MuscleIconKey> = {
  Peito: "peito",
  Ombro: "ombro",
  Costas: "costas",
  Trapézio: "trapezio",
  Abdômen: "abdomen",
  Bíceps: "biceps",
  Tríceps: "triceps",
  Antebraço: "antebraco",
  Glúteos: "gluteos",
  Quadríceps: "quadriceps",
  Posterior: "posterior",
  Panturrilha: "panturrilha",
};

/** Bloco central da arte (88 px nas laterais, centralizado na vertical). */
function Frame({ center = false, children }: { center?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "absolute left-[88px] right-[88px] top-[200px] bottom-[220px] flex flex-col justify-center",
        center && "items-center",
      )}
    >
      {children}
    </div>
  );
}

/** Logo + data (ou outro rótulo) no topo. */
function Header({ right }: { right: ReactNode }) {
  return (
    <div className="self-stretch flex justify-between items-center">
      <Logo className="h-[88px]" />
      <span className="text-[36px] text-fg">{right}</span>
    </div>
  );
}

/** "Registrado com gufapp…" e, quando pedido, "GUF te ajudando a evoluir". */
function Signature({ tagline = false, className }: { tagline?: boolean; className?: string }) {
  return (
    <>
      <div className={cn("flex justify-center gap-[12px] text-[36px] font-semibold", className)}>
        <span className="font-medium text-fg">{STORY_SIGNATURE_LEAD}</span>
        <span className="text-accent-text">{STORY_DOMAIN}</span>
      </div>
      {tagline && (
        <div className="mt-[20px] flex justify-center text-[40px] font-bold tracking-[-.01em] text-fg">
          <span>
            <span className="text-accent-text">GUF</span> te ajudando a evoluir
          </span>
        </div>
      )}
    </>
  );
}

function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-[34px] font-semibold tracking-[.08em] text-accent-text", className)}>{children}</span>;
}

const word = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* F01 · Treino concluído */
export function StoryF01({ d }: StoryModelProps) {
  const stats = [
    { value: d.duration, label: "TEMPO" },
    { value: d.volume, label: d.unit.toUpperCase(), accent: true },
    { value: String(d.sets), label: "SÉRIES" },
    { value: String(d.reps), label: "REPS" },
  ];
  return (
    <Frame>
      <Header right={d.date} />
      <Overline className="mt-[72px]">TREINO CONCLUÍDO</Overline>
      <span className="mt-[12px] text-[96px] leading-[100px] font-bold tracking-[-.02em]">{d.title}</span>
      <div className="mt-[56px] relative flex gap-[48px]">
        <MuscleFigure view="front" height={620} levels={d.muscles} />
        <MuscleFigure view="back" height={620} levels={d.muscles} />
        <div className="absolute right-[-24px] bottom-[-16px]">
          <GufRat occasion="workoutDone" size={320} animated={false} label={null} />
        </div>
      </div>
      {d.muscleLegend.length > 0 && (
        <div className="mt-[32px] flex flex-wrap gap-x-[32px] gap-y-[16px]">
          {d.muscleLegend.map((m) => (
            <div key={m.label} className="flex items-center gap-[12px]">
              <span className={cn("w-[28px] h-[28px] rounded-[8px] bg-accent-text", LEVEL_OPACITY[m.level])}></span>
              <span className="text-[34px] text-fg">{m.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-[48px] py-[40px] px-[44px] rounded-[40px] bg-surface border-[2px] border-border grid grid-cols-4 gap-[16px]">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-[8px]">
            <span className={cn("font-display font-bold text-[64px] leading-[64px]", s.accent && "text-accent-text")}>{s.value}</span>
            <span className="text-[28px] font-semibold tracking-[.08em] text-fg">{s.label}</span>
          </div>
        ))}
      </div>
      <Signature className="mt-[40px]" />
    </Frame>
  );
}

/* F02 · Sequência (em semanas) */
export function StoryF02({ d }: StoryModelProps) {
  const trainedDays = d.streak.days35.filter((c) => c.trained).length;
  return (
    <Frame>
      <Header right={d.date} />
      <div className="mt-[48px] flex items-center gap-[24px]">
        <StreakFlame size={180} className="flex-none text-accent-text" />
        <span className="font-display font-bold text-[300px] leading-[250px] tracking-[-.02em]">{d.streak.current}</span>
      </div>
      <div className="mt-[24px] flex items-end justify-between gap-[24px]">
        <div className="flex flex-col gap-[12px]">
          <span className="text-[64px] leading-[72px] font-bold tracking-[-.02em]">
            {word(d.streak.current, "semana seguida treinando", "semanas seguidas treinando")}
          </span>
          <span className="text-[36px] text-fg">Seu recorde é de {plural(d.streak.best, "semana", "semanas")}</span>
        </div>
        <div className="flex-none">
          <GufRat occasion="streak" size={240} animated={false} label={null} />
        </div>
      </div>
      <div className="mt-[48px] p-[44px] rounded-[40px] bg-surface border-[2px] border-border shadow-story-e2 flex flex-col gap-[24px]">
        <div className="flex justify-between">
          <span className="text-[30px] font-semibold tracking-[.08em] text-fg">ÚLTIMAS 5 SEMANAS</span>
          <span className="text-[32px] font-semibold text-accent-text">{plural(trainedDays, "treino", "treinos")}</span>
        </div>
        <div className="grid grid-cols-7 gap-[16px] justify-items-center">
          {WEEKDAY_INITIALS.map((w, i) => (
            <span key={`h${i}`} className="text-[30px] font-semibold text-fg">
              {w}
            </span>
          ))}
          {d.streak.days35.map((c, i) => (
            <div
              key={i}
              className={cn(
                "w-[72px] h-[72px] rounded-full box-border flex items-center justify-center text-accent-foreground",
                c.trained ? "bg-accent" : "bg-surface-3",
                c.today && "border-[6px] border-story-accent-text",
                c.future && "opacity-40",
              )}
            >
              {c.trained && <Check size={40} strokeWidth={3} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
      <Signature tagline className="mt-[40px]" />
    </Frame>
  );
}

/* F03 · Ficha de treino */
export function StoryF03({ d }: StoryModelProps) {
  const rows = d.exercises.slice(0, 6);
  return (
    <Frame>
      <Header right={d.date} />
      <div className="mt-[56px] flex items-center gap-[40px]">
        <div className="flex gap-[16px] flex-none">
          <MuscleFigure view="front" height={400} levels={d.muscles} />
          <MuscleFigure view="back" height={400} levels={d.muscles} />
        </div>
        <div className="flex flex-col gap-[16px] min-w-0">
          <Overline>FICHA DE TREINO</Overline>
          <span className="text-[64px] leading-[70px] font-bold tracking-[-.02em]">{d.title}</span>
          <span className="text-[34px] text-fg">
            {plural(d.exerciseCount, "exercício", "exercícios")} · {plural(d.sets, "série", "séries")} · {d.duration}
          </span>
        </div>
      </div>
      <div className="mt-[48px] rounded-[40px] bg-surface border-[2px] border-border py-[12px] px-[40px] flex flex-col">
        <div className="grid grid-cols-[56px_minmax(0,1fr)_150px_170px] gap-[16px] items-center py-[20px] border-b-[2px] border-border text-[28px] font-semibold tracking-[.08em] text-fg">
          <span>#</span>
          <span>EXERCÍCIO</span>
          <span>SÉRIES</span>
          <span className="text-right">CARGA</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="grid grid-cols-[56px_minmax(0,1fr)_150px_170px] gap-[16px] items-center h-[96px] border-b-[2px] border-border last:border-b-0"
          >
            <span className="w-[48px] h-[48px] rounded-[12px] bg-surface-3 flex items-center justify-center font-display font-bold text-[34px] text-fg">
              {i + 1}
            </span>
            <span className="truncate text-[38px] font-semibold">{r.name}</span>
            <span className="font-display font-semibold text-[44px]">{r.scheme}</span>
            <span className="truncate font-display font-bold text-[44px] text-accent-text text-right">{r.loadShort}</span>
          </div>
        ))}
      </div>
      <Signature className="mt-[48px]" />
    </Frame>
  );
}

/* F04 · Recorde pessoal */
export function StoryF04({ d }: StoryModelProps) {
  const r = d.records[0];
  if (!r) return null;
  return (
    <Frame center>
      <Header right={d.date} />
      <div className="mt-[120px] w-[200px] h-[200px] rounded-[56px] bg-story-pr-tile shadow-story-pr-glow flex items-center justify-center text-pr-text">
        <Trophy size={112} aria-hidden="true" />
      </div>
      <span className="mt-[64px] text-[36px] font-semibold tracking-[.08em] text-pr-text">RECORDE PESSOAL</span>
      <span className="mt-[16px] text-center text-[80px] leading-[88px] font-bold tracking-[-.02em]">{r.exerciseName}</span>
      <div className="mt-[16px] flex items-baseline gap-[16px]">
        <span className="font-display font-bold text-[360px] leading-[320px] tracking-[-.02em]">{r.load}</span>
        <span className="font-display font-semibold text-[110px] text-fg">{d.unit}</span>
      </div>
      <span className="mt-[24px] py-[14px] px-[32px] rounded-full bg-story-pr-pill text-[38px] font-semibold text-pr-text">
        {r.previousDate ? `${r.delta} desde ${r.previousDate}` : r.delta}
      </span>
      <div className="mt-[48px] self-stretch flex items-end justify-between gap-[24px]">
        <div
          className={cn(
            "flex-1 min-w-0 py-[36px] px-[40px] rounded-[40px] bg-surface border-[2px] border-border shadow-story-e2 grid gap-[24px]",
            r.previousLoad ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {/* O app não guarda as repetições da marca anterior: ANTES mostra só a carga. */}
          {r.previousLoad && (
            <div className="flex flex-col gap-[8px]">
              <span className="text-[28px] font-semibold tracking-[.08em] text-fg">ANTES</span>
              <span className="font-display font-semibold text-[60px] leading-[60px] text-fg">{r.previousLoad}</span>
            </div>
          )}
          <div className="flex flex-col gap-[8px]">
            <span className="text-[28px] font-semibold tracking-[.08em] text-pr-text">AGORA</span>
            <span className="font-display font-bold text-[60px] leading-[60px]">
              {r.reps ? `${r.load} × ${r.reps}` : r.load}
            </span>
          </div>
        </div>
        <div className="flex-none">
          <GufRat occasion="personalRecord" size={300} animated={false} label={null} />
        </div>
      </div>
      <Signature tagline className="mt-[40px]" />
    </Frame>
  );
}

/* F05 · Volume da semana */
export function StoryF05({ d }: StoryModelProps) {
  const change = d.week.changePct?.replace(/^[+\-−]/, "");
  const icons = d.week.muscleLegend.flatMap((label) => {
    const key = LABEL_ICON[label];
    return key ? [{ label, key }] : [];
  });
  return (
    <Frame>
      <Header right={d.week.range} />
      <span className="mt-[40px] text-[34px] font-semibold tracking-[.08em] text-fg">VOLUME DA SEMANA</span>
      <div className="flex items-baseline gap-[16px]">
        <span className="font-display font-bold text-[240px] leading-[230px] tracking-[-.01em] text-accent-text">{d.week.volume}</span>
        <span className="font-display font-semibold text-[80px] text-fg">{d.unit}</span>
      </div>
      {change && (
        <div className="mt-[8px] flex items-center gap-[12px] text-[36px] text-fg">
          {d.week.changeUp ? (
            <TrendingUp size={36} className="text-success" aria-hidden="true" />
          ) : (
            <TrendingDown size={36} aria-hidden="true" />
          )}
          <span>
            {change} {d.week.changeUp ? "a mais" : "a menos"} que a semana passada
          </span>
        </div>
      )}
      <div className="mt-[56px] pt-[40px] px-[40px] pb-[32px] rounded-[40px] bg-surface border-[2px] border-border grid grid-cols-7 gap-[16px] items-end">
        {d.week.days.map((day) => (
          <div key={day.short} className="flex flex-col items-center gap-[12px]">
            <span className="font-display font-semibold text-[34px]">{day.volume}</span>
            {day.trained ? (
              // Altura proporcional ao volume do dia (valor dinâmico; máximo 440 px).
              <div className="w-[80px] rounded-[16px] bg-accent" style={{ height: `${Math.max(16, Math.round(day.pct * 4.4))}px` }}></div>
            ) : (
              <div className={cn("w-[80px] h-[16px] rounded-[8px] bg-surface-3", day.future && "opacity-40")}></div>
            )}
            <span className="text-[32px] text-fg">{day.short}</span>
          </div>
        ))}
      </div>
      {icons.length > 0 && (
        <div className="mt-[40px] grid grid-cols-4 gap-[16px]">
          {icons.map((m) => (
            <div key={m.key} className="flex flex-col items-center gap-[8px]">
              <div className="w-[140px] h-[140px] rounded-[32px] bg-surface border-[2px] border-border flex items-center justify-center">
                <MuscleIcon muscle={m.key} size={112} zoom animate="none" label="" />
              </div>
              <span className="text-[34px] text-fg">{m.label}</span>
            </div>
          ))}
        </div>
      )}
      <Signature className="mt-[48px]" />
    </Frame>
  );
}

/* F06 · Resumo do mês */
export function StoryF06({ d }: StoryModelProps) {
  const month = d.month.current;
  return (
    <Frame>
      <Header right={d.month.label} />
      <Overline className="mt-[40px]">RESUMO DO MÊS</Overline>
      <span className="mt-[12px] text-[84px] leading-[92px] font-bold tracking-[-.02em]">
        {plural(month.workouts, "treino", "treinos")} em {month.name.toLowerCase()}
      </span>
      <div className="mt-[48px] p-[40px] rounded-[40px] bg-surface border-[2px] border-border shadow-story-e2 grid grid-cols-7 gap-[14px]">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={`h${i}`} className="text-center text-[30px] font-semibold text-fg">
            {w}
          </span>
        ))}
        {d.month.calendar.map((c, i) =>
          c ? (
            <div
              key={i}
              className={cn(
                "h-[80px] rounded-[20px] flex items-center justify-center font-display font-semibold text-[36px]",
                c.trained ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
                c.future && "opacity-40",
              )}
            >
              {c.day}
            </div>
          ) : (
            <div key={i} className="h-[80px]"></div>
          ),
        )}
      </div>
      <div className="mt-[48px] flex items-center gap-[48px]">
        <div className="flex gap-[12px] flex-none">
          <MuscleFigure view="front" height={340} levels={month.muscles} />
          <MuscleFigure view="back" height={340} levels={month.muscles} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-[36px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-[30px] font-semibold tracking-[.08em] text-fg">VOLUME</span>
            <div className="flex items-baseline gap-[8px]">
              <span className="font-display font-bold text-[84px] leading-[84px] text-accent-text">{month.volumeFull}</span>
              <span className="text-[34px] text-fg">{d.unit}</span>
            </div>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[30px] font-semibold tracking-[.08em] text-fg">TEMPO</span>
            <span className="font-display font-bold text-[84px] leading-[84px]">{d.month.duration}</span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[30px] font-semibold tracking-[.08em] text-fg">GRUPOS</span>
            <span className="font-display font-bold text-[84px] leading-[84px]">{month.groups}</span>
          </div>
        </div>
      </div>
      <Signature className="mt-[48px]" />
    </Frame>
  );
}

/* Gráfico da carga máxima (viewBox 824 × 220; pontos entre y 28 e 192). */
function LoadChart({ loads }: { loads: number[] }) {
  const min = Math.min(...loads);
  const max = Math.max(...loads);
  const points = loads.map((v, i) => ({
    x: loads.length === 1 ? 412 : 12 + (800 * i) / (loads.length - 1),
    y: max === min ? 110 : 192 - ((v - min) / (max - min)) * 164,
  }));
  const last = points[points.length - 1];
  return (
    <svg width="824" height="220" viewBox="0 0 824 220" className="block overflow-visible" aria-hidden="true">
      {[15, 110, 205].map((y) => (
        <line key={y} x1="0" y1={y} x2="824" y2={y} className="stroke-border" strokeWidth="2" />
      ))}
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        className="stroke-data"
        strokeWidth="8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="12" className="fill-data" />
      ))}
      {last && <circle cx={last.x} cy={last.y} r="20" className="fill-accent stroke-surface" strokeWidth="6" />}
    </svg>
  );
}

/* F07 · Carga subiu */
export function StoryF07({ d }: StoryModelProps) {
  const f = d.featured;
  if (!f) return null;
  return (
    <Frame>
      <Header right={d.date} />
      <div className="mt-[32px] flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[12px] min-w-0">
          <Overline>CARGA SUBIU</Overline>
          <span className="text-[64px] leading-[70px] font-bold tracking-[-.02em]">{f.exerciseName}</span>
        </div>
        <div className="flex-none">
          <GufRat occasion="loadUp" size={260} animated={false} label={null} />
        </div>
      </div>
      <div className="mt-[24px] flex items-center gap-[32px]">
        <span className="font-display font-semibold text-[120px] leading-[110px] text-fg">{f.loadFirst}</span>
        <ArrowRight size={88} className="text-accent-text" aria-hidden="true" />
        <span className="font-display font-bold text-[170px] leading-[156px] text-accent-text">{f.loadNow}</span>
        <span className="font-display font-semibold text-[80px] text-fg">{d.unit}</span>
      </div>
      <div className="mt-[32px] py-[32px] px-[40px] rounded-[40px] bg-surface border-[2px] border-border flex flex-col gap-[24px]">
        <div className="flex justify-between">
          <span className="text-[30px] font-semibold tracking-[.08em] text-fg">CARGA MÁXIMA · 8 SEMANAS</span>
          {f.loadChangePct && <span className="text-[32px] font-semibold text-success">{f.loadChangePct}</span>}
        </div>
        <LoadChart loads={f.loads} />
        <div className="flex justify-between text-[30px] text-fg">
          <span>
            {f.loadFirst} {d.unit}
          </span>
          <span>
            {f.loadNow} {d.unit}
          </span>
        </div>
      </div>
      <div className="mt-[40px] flex items-center gap-[32px]">
        <div className="flex gap-[12px] flex-none">
          <MuscleFigure view="front" height={300} levels={d.muscles} />
          <MuscleFigure view="back" height={300} levels={d.muscles} />
        </div>
        <div className="flex flex-col gap-[8px] min-w-0">
          {d.routine && <span className="text-[30px] font-semibold tracking-[.08em] text-fg">{d.routine.toUpperCase()}</span>}
          <span className="text-[44px] leading-[52px] font-bold">{d.focus}</span>
          <span className="text-[34px] text-fg">
            {plural(d.exerciseCount, "exercício", "exercícios")} · {plural(d.sets, "série", "séries")}
          </span>
        </div>
      </div>
      <Signature className="mt-[48px]" />
    </Frame>
  );
}

/* F08 · Projeto */
export function StoryF08({ d }: StoryModelProps) {
  const p = d.project;
  if (!p) return null;
  const stats = [
    { value: String(p.workouts), label: word(p.workouts, "TREINO", "TREINOS") },
    { value: p.volume, label: `${d.unit.toUpperCase()} DE VOLUME` },
    { value: String(p.weeks), label: word(p.weeks, "SEMANA", "SEMANAS") },
  ];
  return (
    <Frame center>
      <Header right={d.date} />
      <div className="mt-[40px]">
        <GufRat occasion="projectDone" size={380} animated={false} label={null} />
      </div>
      <div className="mt-[48px] self-stretch py-[64px] px-[56px] rounded-[48px] bg-accent text-accent-foreground flex flex-col gap-[16px]">
        <span className="text-[34px] font-bold tracking-[.08em]">PROJETO</span>
        <span className="font-display font-bold text-[112px] leading-[104px] tracking-[-.01em]">{p.name}</span>
        <span className="text-[34px] font-semibold">{plural(p.weeks, "semana", "semanas")} de projeto</span>
        <div className="mt-[24px] pt-[32px] border-t-[2px] border-story-accent-foreground grid grid-cols-[auto_1fr_auto] gap-[40px]">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-[4px]">
              <span className="font-display font-bold text-[72px] leading-[72px]">{s.value}</span>
              <span className="text-[30px] font-bold tracking-[.08em]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <Signature tagline className="mt-[40px]" />
    </Frame>
  );
}

/* F09 · Números + boneco */
export function StoryF09({ d }: StoryModelProps) {
  return (
    <>
      <div className="absolute right-[-40px] top-[380px]">
        <MuscleFigure view="front" height={1080} levels={d.muscles} />
      </div>
      <Frame>
        <Logo className="h-[88px]" />
        {d.routine && <Overline className="mt-[72px]">{d.routine.toUpperCase()}</Overline>}
        <span
          className={cn("w-[520px] text-[76px] leading-[82px] font-bold tracking-[-.02em]", d.routine ? "mt-[8px]" : "mt-[72px]")}
        >
          {d.focus}
        </span>
        <span className="mt-[12px] text-[34px] text-fg">{d.date}</span>
        <div className="mt-[72px] w-[520px] flex flex-col gap-[44px]">
          <BigNumber label="VOLUME" value={d.volume} unit={d.unit} accent />
          <BigNumber label="TEMPO" value={d.duration} />
          <div className="flex gap-[56px]">
            <BigNumber label="SÉRIES" value={String(d.sets)} />
            <BigNumber label="REPS" value={String(d.reps)} />
          </div>
        </div>
        <Signature className="mt-[48px]" />
      </Frame>
    </>
  );
}

function BigNumber({ label, value, unit, accent = false }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[32px] font-semibold tracking-[.08em] text-fg">{label}</span>
      <div className="flex items-baseline gap-[8px]">
        <span className={cn("font-display font-bold text-[170px] leading-[150px]", accent && "text-accent-text")}>{value}</span>
        {unit && <span className="text-[40px] text-fg">{unit}</span>}
      </div>
    </div>
  );
}

/* Anel da meta (viewBox 700, r = 300). */
const RING_R = 300;
const RING = Math.round(2 * Math.PI * RING_R);

function goalTitle(d: Data): string {
  const left = d.week.remaining;
  if (left === 0) return "Meta da semana cumprida";
  return left === 1 ? "Falta 1 treino" : `Faltam ${left} treinos`;
}

/* F10 · Meta da semana */
export function StoryF10({ d }: StoryModelProps) {
  const progress = Math.min(1, Math.max(0, d.week.goalProgress));
  const angle = ((-90 + 360 * progress) * Math.PI) / 180;
  const dot = { x: 350 + RING_R * Math.cos(angle), y: 350 + RING_R * Math.sin(angle) };
  return (
    <Frame center>
      <Header right={`Semana ${d.streak.weekNumber}`} />
      <Overline className="mt-[40px]">META DA SEMANA</Overline>
      <span className="mt-[12px] text-[72px] leading-[80px] font-bold tracking-[-.02em] text-center">{goalTitle(d)}</span>
      <div className="mt-[32px] relative w-[560px] h-[560px]">
        <svg width="560" height="560" viewBox="0 0 700 700" className="block" aria-hidden="true">
          <circle cx="350" cy="350" r={RING_R} fill="none" className="stroke-surface-3" strokeWidth="56" />
          {progress > 0 && (
            <>
              {/* Traço proporcional ao progresso da meta (valor dinâmico). */}
              <circle
                cx="350"
                cy="350"
                r={RING_R}
                fill="none"
                className="stroke-accent"
                strokeWidth="56"
                strokeLinecap="round"
                strokeDasharray={`${Math.round(RING * progress)} ${RING}`}
                transform="rotate(-90 350 350)"
              />
              <circle cx={dot.x.toFixed(1)} cy={dot.y.toFixed(1)} r="22" className="fill-accent" />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px]">
          <div className="flex items-baseline">
            <span className="font-display font-bold text-[210px] leading-[180px]">{d.week.count}</span>
            <span className="font-display font-semibold text-[110px] text-fg">/{d.week.goal ?? d.week.count}</span>
          </div>
          <span className="text-[34px] font-semibold tracking-[.08em] text-fg">{word(d.week.goal ?? d.week.count, "TREINO", "TREINOS")}</span>
        </div>
      </div>
      <div className="mt-[32px] self-stretch grid grid-cols-7 gap-[12px] justify-items-center">
        {d.week.days.map((day) => (
          <div key={day.short} className="flex flex-col items-center gap-[12px]">
            <div
              className={cn(
                "w-[96px] h-[96px] rounded-full box-border",
                day.trained
                  ? "bg-accent text-accent-foreground flex items-center justify-center"
                  : day.future
                    ? "border-[4px] border-dashed border-border-strong"
                    : "bg-surface-3",
              )}
            >
              {day.trained && <Check size={44} strokeWidth={3} aria-hidden="true" />}
            </div>
            <span className="text-[32px] text-fg">{day.short}</span>
          </div>
        ))}
      </div>
      <div className="mt-[48px] self-stretch flex items-center gap-[24px] py-[24px] px-[32px] rounded-[40px] bg-surface border-[2px] border-border">
        <div className="flex-none">
          <GufRat occasion="goalReached" size={160} animated={false} label={null} />
        </div>
        <span className="text-[36px] leading-[46px] font-semibold">Sábado fecha o Anel da semana.</span>
      </div>
      <Signature tagline className="mt-[40px]" />
    </Frame>
  );
}
