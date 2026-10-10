"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, CircleCheck, Dumbbell, Ellipsis, Play, Plus, StickyNote, Timer, Trash2 } from "lucide-react";
import {
  AppHeader,
  AppIcon,
  Banner,
  BottomNav,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  ConfirmDialog,
  EmptyState,
  ExerciseCard,
  Fab,
  GoogleButton,
  Icon,
  IconButton,
  LargeTitle,
  Logo,
  MonthCalendar,
  NumericKeypad,
  PasswordField,
  PRBadge,
  PRHighlight,
  ProgressChart,
  ProjectCard,
  QuickLoad,
  RadioGroup,
  ReorderList,
  RestTimer,
  RestTimerBar,
  RoutineCard,
  SearchField,
  SegmentedControl,
  SetRow,
  SetRowHeader,
  SetTypeTag,
  SheetOption,
  Skeleton,
  SkeletonCard,
  Stepper,
  Switch,
  Tag,
  TextField,
  Toast,
  WorkoutSummaryCard,
} from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  CALENDAR,
  CHART_PERIOD_OPTIONS,
  CHART_VALUES,
  COLOR_GROUPS,
  COLOR_ON,
  DURATIONS,
  EASES,
  EXERCISE,
  FORM_DEFAULTS,
  ICONS,
  METRIC_OPTIONS,
  MUSCLE_FILTERS,
  NEXT_ROUTINE,
  PERIOD_OPTIONS,
  PROJECTS,
  RADII,
  REORDER_ITEMS,
  REST_TIMER,
  SPACES,
  START_SHEET,
  THEME_OPTIONS,
  THEMES,
  TYPE_SCALE,
  WEIGHT_UNIT_OPTIONS,
  WORKOUT_SUMMARY,
  type ThemeKey,
} from "@/mocks/design-system";

const SECTIONS = [
  { id: "cores", label: "Cores" },
  { id: "tipografia", label: "Tipografia" },
  { id: "espacamento", label: "Espaçamento" },
  { id: "elevacao", label: "Elevação" },
  { id: "movimento", label: "Movimento" },
  { id: "componentes", label: "Componentes" },
];

const PANEL = "rounded-lg border border-border bg-surface";
const OVERLINE = "text-[11px] font-semibold tracking-[0.08em] uppercase";

export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background font-sans text-fg">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-4 pt-12 pb-8 sm:px-10">
        <div className="grid gap-4">
          <Logo size={40} />
          <div className="grid gap-1.5">
            <span className={cn(OVERLINE, "text-fg-muted")}>Design system · v1.0</span>
            <h1 className="m-0 text-[40px] leading-[44px] font-bold tracking-[-0.02em]">Guf — Evolução Fitness</h1>
            <p className="m-0 max-w-[560px] text-base leading-6 text-pretty text-fg-secondary">
              Cores, tipografia, espaçamento, elevação, movimento e componentes, lado a lado nos temas escuro e claro.
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Seções">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm">
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,560px),1fr))]">
        <ThemeColumn theme="dark" anchors />
        <ThemeColumn theme="light" />
      </div>
    </div>
  );
}

function ThemeColumn({ theme, anchors = false }: { theme: ThemeKey; anchors?: boolean }) {
  const t = THEMES[theme];
  const id = (name: string) => (anchors ? name : undefined);
  return (
    <div
      data-theme={theme}
      className="grid min-w-0 content-start gap-14 border-r border-border bg-background px-4 pt-8 pb-20 text-fg sm:px-10"
    >
      <div className="sticky top-0 z-[5] -mx-4 -mt-8 flex items-center gap-2.5 border-b border-border bg-background/88 px-4 py-3.5 backdrop-blur-[12px] sm:-mx-10 sm:px-10">
        <Icon icon={t.icon} size={18} className="text-accent-text" />
        <strong className="text-base">Tema {t.label}</strong>
        <span className="text-xs text-fg-muted">{t.note}</span>
      </div>

      <ColorsSection id={id("cores")} />
      <TypographySection id={id("tipografia")} />
      <SpacingSection id={id("espacamento")} />
      <ElevationSection id={id("elevacao")} note={t.elevNote} />
      <MotionSection id={id("movimento")} />
      <ComponentsSection id={id("componentes")} theme={theme} />
    </div>
  );
}

function SectionHeader({ index, title, children, action }: { index: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <span className={cn(OVERLINE, "text-accent-text")}>{index}</span>
        <h2 className="m-0 text-[22px] leading-7 font-semibold tracking-[-0.015em]">{title}</h2>
        {children && <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">{children}</p>}
      </div>
      {action}
    </div>
  );
}

function Section({ id, children, gap = "gap-6" }: { id?: string; children: ReactNode; gap?: string }) {
  return (
    <section id={id} className={cn("grid scroll-mt-16", gap)}>
      {children}
    </section>
  );
}

/** Lê o valor resolvido do token no tema do elemento (sem duplicar hex no código). */
function readToken(token: string) {
  return (el: HTMLElement | null) => {
    if (!el) return;
    el.textContent = getComputedStyle(el).getPropertyValue(`--${token}`).trim().toUpperCase();
  };
}

function ColorsSection({ id }: { id?: string }) {
  return (
    <Section id={id}>
      <SectionHeader index="01 · Cores" title="Tokens semânticos">
        Componentes usam só tokens. Volt em ação principal, seleção e conquistas; dourado só em recordes.
      </SectionHeader>
      {COLOR_GROUPS.map((g) => (
        <div key={g.name} className="grid gap-2.5">
          <span className="text-xs font-medium text-fg-muted">{g.name}</span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {g.tokens.map((token) => (
              <div key={token} className="grid overflow-hidden rounded-md border border-border bg-surface">
                <div
                  className="flex h-16 items-end border-b border-border px-2.5 py-2"
                  style={{ background: `var(--${token})` }}
                >
                  <span className="text-xs font-semibold" style={{ color: `var(--${g.on ?? COLOR_ON[token] ?? "text-primary"})` }}>
                    Aa
                  </span>
                </div>
                <div className="grid gap-0.5 px-2.5 pt-2 pb-2.5">
                  <span className="font-mono text-xs font-semibold">--{token}</span>
                  <span ref={readToken(token)} className="font-mono text-xs text-fg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function TypographySection({ id }: { id?: string }) {
  return (
    <Section id={id}>
      <SectionHeader index="02 · Tipografia" title="Inter + Barlow Condensed">
        Inter para interface. Barlow Condensed 600/700 para números (sempre tabular) e títulos de conquista.
      </SectionHeader>
      <div className={cn(PANEL, "grid overflow-hidden shadow-e1")}>
        {TYPE_SCALE.map((row, i) => (
          <div
            key={row.token}
            className={cn(
              "grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-5 py-4",
              i < TYPE_SCALE.length - 1 && "border-b border-border",
            )}
          >
            <span className="font-mono text-xs text-fg-muted">
              {row.token}
              <br />
              {row.spec}
            </span>
            <span className={cn("min-w-0 break-words", row.className)}>{row.sample}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SpacingSection({ id }: { id?: string }) {
  return (
    <Section id={id}>
      <SectionHeader index="03 · Espaçamento, raios e toque" title="Grid de 4px" />
      <div className={cn(PANEL, "grid gap-2 p-5 shadow-e1")}>
        {SPACES.map((s) => (
          <div key={s.n} className="grid grid-cols-[90px_44px_minmax(0,1fr)] items-center gap-3">
            <span className="font-mono text-xs text-fg-secondary">--space-{s.n}</span>
            <span className="text-right font-mono text-xs text-fg-muted">{s.px}px</span>
            <div className="h-4 rounded-[4px] bg-accent" style={{ width: s.px }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
        {RADII.map((r) => (
          <div key={r.name} className="grid justify-items-center gap-2 rounded-md border border-border bg-surface px-2 py-3.5">
            <div className="size-14 border-[1.5px] border-accent-text bg-surface-3" style={{ borderRadius: r.value }} />
            <span className="text-xs font-semibold">{r.name}</span>
            <span className="text-center text-[11px] text-fg-muted">{r.use}</span>
          </div>
        ))}
      </div>
      <div className={cn(PANEL, "flex flex-wrap items-end gap-6 p-5")}>
        <div className="grid justify-items-center gap-2">
          <div className="grid size-11 place-items-center rounded-md border-[1.5px] border-dashed border-border-strong text-xs font-semibold">
            44
          </div>
          <span className="text-xs text-fg-muted">Toque mínimo</span>
        </div>
        <div className="grid justify-items-center gap-2">
          <div className="grid size-14 place-items-center rounded-md border-[1.5px] border-dashed border-accent-text text-xs font-semibold">
            56
          </div>
          <span className="text-xs text-fg-muted">Ações de treino</span>
        </div>
        <div className="grid justify-items-center gap-2">
          <div className="flex gap-2">
            <div className="size-11 rounded-md bg-surface-3" />
            <div className="size-11 rounded-md bg-surface-3" />
          </div>
          <span className="text-xs text-fg-muted">8px entre alvos</span>
        </div>
      </div>
    </Section>
  );
}

function ElevationSection({ id, note }: { id?: string; note: string }) {
  const tile = "grid h-24 content-end gap-1 rounded-lg border border-border p-4";
  return (
    <Section id={id}>
      <SectionHeader index="04 · Elevação" title={note} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 rounded-lg border border-border bg-background p-6">
        <div className={cn(tile, "bg-surface shadow-e1")}>
          <strong className="text-sm">e1 · surface</strong>
          <span className="text-xs text-fg-muted">Cards</span>
        </div>
        <div className={cn(tile, "bg-surface-elevated shadow-e2")}>
          <strong className="text-sm">e2 · elevated</strong>
          <span className="text-xs text-fg-muted">Barras flutuantes, timer</span>
        </div>
        <div className={cn(tile, "bg-surface-elevated shadow-e3")}>
          <strong className="text-sm">e3 · overlay</strong>
          <span className="text-xs text-fg-muted">Sheet, modal, toast, FAB</span>
        </div>
      </div>
    </Section>
  );
}

function MotionSection({ id }: { id?: string }) {
  const [played, setPlayed] = useState(false);
  return (
    <Section id={id}>
      <SectionHeader
        index="05 · Movimento"
        title="Rápido e funcional"
        action={
          <Button variant="secondary" icon={Play} onClick={() => setPlayed(!played)}>
            Reproduzir
          </Button>
        }
      />
      <div className={cn(PANEL, "grid gap-2.5 p-5")}>
        {EASES.map((e) => (
          <div key={e.name} className="grid gap-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-[13px] font-semibold">{e.name}</span>
              <span className="font-mono text-xs text-fg-muted">{e.curve}</span>
            </div>
            <div className="relative h-6 rounded-pill bg-surface-3">
              <div
                className="absolute top-1 size-4 rounded-pill bg-accent"
                style={{
                  left: played ? "calc(100% - 20px)" : "4px",
                  transition: `left 700ms var(${e.token})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className={cn(PANEL, "grid gap-2 p-5")}>
        {DURATIONS.map((d) => (
          <div key={d.name} className="grid grid-cols-[96px_52px_minmax(0,1fr)] items-center gap-3">
            <span className="font-mono text-xs text-fg-secondary">{d.name}</span>
            <span className="text-right font-display text-xs font-semibold tabular-nums">{d.ms}ms</span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-1.5 flex-none rounded-pill bg-data" style={{ width: `${d.pct}%` }} />
              <span className="truncate text-[11px] text-fg-muted">{d.use}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3.5">
      <h3 className="m-0 text-lg leading-6 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function ComponentsSection({ id, theme }: { id?: string; theme: ThemeKey }) {
  return (
    <Section id={id} gap="gap-10">
      <SectionHeader index="06 · Componentes" title="Biblioteca" />

      <Group title="Marca e ícones">
        <div className={cn(PANEL, "flex flex-wrap items-center gap-6 p-5")}>
          <Logo size={56} />
          <Logo size={26} />
          <Logo size={32} wordmark={false} />
          <AppIcon size={64} />
          <AppIcon size={40} />
        </div>
        <div className={cn(PANEL, "grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2 p-4")}>
          {ICONS.map((ic) => (
            <div key={ic.name} title={ic.name} className="grid h-11 place-items-center rounded-[10px] bg-surface-3 text-fg-secondary">
              <Icon icon={ic.icon} size={20} label={ic.name} />
            </div>
          ))}
        </div>
      </Group>

      <Group title="Ações">
        <div className={cn(PANEL, "grid gap-4 p-5")}>
          <div className="flex flex-wrap gap-2">
            <Button icon={Play}>Iniciar treino</Button>
            <Button variant="secondary">Salvar</Button>
            <Button variant="outline">Continuar</Button>
            <Button variant="ghost">Desfazer</Button>
            <Button variant="danger" icon={Trash2}>
              Excluir
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="md">md 44</Button>
            <Button size="tall">tall 48</Button>
            <Button size="lg">lg 56</Button>
            <Button loading>Salvando</Button>
            <Button disabled>Finalizar</Button>
          </div>
          <Button size="lg" fullWidth iconRight={ArrowUpRight}>
            Finalizar treino
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon={Ellipsis} label="Mais opções" />
            <IconButton icon={StickyNote} label="Nota" variant="ghost" />
            <IconButton icon={Plus} label="Adicionar" variant="primary" />
            <IconButton icon={Timer} label="Descanso" pressed />
            <Fab label="Adicionar exercício" />
          </div>
          <GoogleButton />
        </div>
      </Group>

      <Group title="Formulários">
        <div className={cn(PANEL, "grid gap-4 p-5")}>
          <TextField label="Nome" defaultValue={FORM_DEFAULTS.name} autoComplete="name" />
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            defaultValue={FORM_DEFAULTS.emailInvalid}
            error={FORM_DEFAULTS.emailError}
            autoComplete="email"
          />
          <PasswordField label="Senha" defaultValue={FORM_DEFAULTS.password} />
          <SearchField />
          <div className="grid gap-1">
            <Switch label="Som ao fim do descanso" defaultChecked />
            <Switch label="Vibração" />
          </div>
          {/* LGPD (CLAUDE.md): duas confirmações separadas, sempre desmarcadas */}
          <div className="grid gap-1">
            <Checkbox>Tenho 18 anos ou mais</Checkbox>
            <Checkbox>Li e aceito os Termos de Uso e a Política de Privacidade</Checkbox>
          </div>
          <RadioGroup options={WEIGHT_UNIT_OPTIONS} defaultValue="kg" label="Unidade de carga" />
          <SegmentedControl options={PERIOD_OPTIONS} defaultValue="Semana" label="Período" />
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl options={CHART_PERIOD_OPTIONS} defaultValue="3M" variant="solid" label="Período do gráfico" />
            <SegmentedControl options={THEME_OPTIONS} defaultValue={theme} size="sm" label="Tema" />
          </div>
          <SegmentedControl options={METRIC_OPTIONS} defaultValue="Carga" shape="rounded" label="Métrica" />
        </div>
      </Group>

      <Group title="Exibição">
        <div className={cn(PANEL, "grid gap-4 p-5")}>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_FILTERS.map((m, i) => (
              <Chip key={m} label={m} defaultSelected={i === 0} icon={m === "Pernas" ? Dumbbell : undefined} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag size="sm">Peito</Tag>
            <Tag icon={Dumbbell}>Barra</Tag>
            <Tag size="sm" tone="muted" icon={Timer}>
              1:30
            </Tag>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SetTypeTag type="warmup" />
            <SetTypeTag type="normal" letter="1" />
            <SetTypeTag type="dropset" />
            <SetTypeTag type="failure" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PRBadge size="sm" />
            <PRBadge size="md" />
          </div>
          <PRHighlight label="Maior carga · Supino reto" value="82,5 kg × 8" />
          <ProgressChart values={CHART_VALUES} startLabel="Jul" endLabel="Out" unit="kg" ariaLabel="Evolução da carga no supino" />
          <MonthCalendar
            monthLabel={CALENDAR.monthLabel}
            monthName={CALENDAR.monthName}
            daysInMonth={CALENDAR.daysInMonth}
            startWeekday={CALENDAR.startWeekday}
            levels={CALENDAR.levels}
            today={CALENDAR.today}
            defaultSelected={CALENDAR.selected}
          />
        </div>
      </Group>

      <Group title="Cards">
        <div className="grid gap-3">
          <RoutineCard {...NEXT_ROUTINE} />
          {PROJECTS.map((p) => (
            <ProjectCard key={p.title} {...p} />
          ))}
          <WorkoutSummaryCard {...WORKOUT_SUMMARY} />
        </div>
      </Group>

      <Group title="Treino">
        <div className="grid gap-3">
          <ExerciseCard
            name={EXERCISE.name}
            tags={EXERCISE.tags}
            rest={EXERCISE.rest}
            sets={EXERCISE.sets}
            bestKg={EXERCISE.bestKg}
          />
          <div className={cn(PANEL, "grid gap-1 py-3")}>
            <SetRowHeader />
            <SetRow type="warmup" previous="40 × 12" weightKg={40} reps={12} done />
            <SetRow number={1} previous="80 × 10" weightKg={82.5} reps={8} done pr />
            <SetRow number={2} previous="80 × 9" weightKg={80} reps={9} field={{ key: "kg", state: "editing" }} />
            <SetRow type="dropset" previous="60 × 12" weightKg={60} reps={null} field={{ key: "reps", state: "error" }} />
            <SetRow type="failure" previous="60 × 8" weightKg={60} reps={8} />
          </div>
          <div className={cn(PANEL, "grid gap-4 p-5")}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Stepper label="Carga (kg)" defaultValue={82.5} step={2.5} min={0} />
              <Stepper label="Repetições" defaultValue={8} step={1} min={0} />
            </div>
            <QuickLoad />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            <div className={cn(PANEL, "p-4")}>
              <NumericKeypad defaultValue="82,5" unit="kg" label="Carga" />
            </div>
            <div className={cn(PANEL, "grid place-items-center p-4")}>
              <RestTimer remaining={REST_TIMER.remaining} total={REST_TIMER.total} running />
            </div>
          </div>
          <RestTimerBar remaining={REST_TIMER.remaining} total={REST_TIMER.total} next={REST_TIMER.next} />
        </div>
      </Group>

      <Group title="Navegação">
        <div className="grid gap-3 overflow-hidden rounded-lg border border-border bg-background">
          <AppHeader title="Histórico" collapsed={false} />
          <div className="px-4">
            <LargeTitle>Histórico</LargeTitle>
          </div>
          <AppHeader title="Histórico" collapsed />
          <div className="px-4">
            <ReorderList items={REORDER_ITEMS} />
          </div>
          <BottomNav defaultValue={0} />
        </div>
      </Group>

      <Group title="Overlays">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          <div className="relative h-[380px] overflow-hidden rounded-lg border border-border bg-background">
            <BottomSheet title={START_SHEET.title} subtitle={START_SHEET.subtitle}>
              {START_SHEET.options.map((o) => (
                <SheetOption key={o.letter} {...o} />
              ))}
              <SheetOption icon={Plus} title="Treino livre" dashed />
            </BottomSheet>
          </div>
          <div className="relative h-[380px] overflow-hidden rounded-lg border border-border bg-background">
            <ConfirmDialog
              title="Finalizar treino?"
              message="2 séries não foram concluídas e não entram no histórico."
              cancelLabel="Continuar"
              confirmLabel="Finalizar"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Toast message="Série removida" icon={Trash2} actionLabel="Desfazer" />
          <Toast message="Treino salvo" icon={CircleCheck} />
        </div>
      </Group>

      <Group title="Feedback">
        <div className="grid gap-2">
          <Banner tone="warning" title="Sem conexão">
            seu treino está salvo no aparelho
          </Banner>
          <Banner tone="danger" actionLabel="Tentar">
            Não foi possível carregar. Verifique a internet e tente de novo.
          </Banner>
          <Banner tone="success" title="Treino concluído">
            salvo no histórico
          </Banner>
          <Banner tone="info">Toque no número da série para mudar o tipo.</Banner>
        </div>
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino ainda"
          message="Que tal começar o primeiro? Leva menos de um minuto para montar."
          actionLabel="Criar rotina"
        />
        <div className={cn(PANEL, "grid gap-2.5 p-5")}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="80%" height={12} />
        </div>
        <SkeletonCard />
      </Group>
    </Section>
  );
}
