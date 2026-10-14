"use client";

import { useState } from "react";
import {
  AppIcon,
  Button,
  GUF_LOADER_VARIANTS,
  GufLoader,
  LoadingScreen,
  Logo,
  MUSCLE_ICON_KEYS,
  MUSCLE_ICONS,
  MuscleFilterTile,
  MuscleIcon,
  SavingOverlay,
  StreakFlame,
  type StreakFlameAnimation,
  type MuscleIconKey,
} from "@/components/ds";
import { cn } from "@/lib/utils";
import { Group, OVERLINE, PANEL, Section, SectionHeader } from "./layout";

const LOADER_SIZES = [16, 24, 32, 48, 72];

/** 07 · Logo em SVG, as 10 animações do GufLoader e os componentes de carregamento. */
export function BrandLoadingSection({ id }: { id?: string }) {
  return (
    <Section id={id} gap="gap-10">
      <SectionHeader index="07 · Marca e carregamento" title="Logo e loading">
        Logo em SVG (só formas, segue o tema), 10 animações numeradas do símbolo &quot;Anel&quot; e os componentes de carregamento. No app:
        02 em todo carregamento e na abertura; 07 ao salvar o treino.
      </SectionHeader>

      <Group title="Logo">
        <div className={cn(PANEL, "flex flex-wrap items-end gap-6 p-5")}>
          <Logo size="xl" />
          <Logo size="lg" />
          <Logo size="md" />
          <Logo size="sm" />
        </div>
        <div className={cn(PANEL, "flex flex-wrap items-center gap-6 p-5")}>
          <span className="text-fg-secondary">
            <Logo size="lg" tone="mono" />
          </span>
          <Logo size="xl" wordmark={false} />
          <Logo size="md" wordmark={false} />
          <Logo size="sm" wordmark={false} />
          <AppIcon size="lg" />
          <AppIcon size="md" />
          <AppIcon size="sm" />
        </div>
      </Group>

      <Group title="Animações (GufLoader 01–10)">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {GUF_LOADER_VARIANTS.map((v) => (
            <div key={v.variant} className={cn(PANEL, "flex flex-col gap-3 p-4")}>
              <div className="flex items-start justify-between">
                <span className="font-display text-[22px] leading-none font-bold text-accent-text tabular-nums">
                  {String(v.variant).padStart(2, "0")}
                </span>
                <span className="text-[11px] text-fg-muted tabular-nums">{v.cycle}</span>
              </div>
              <div className="grid h-20 place-items-center">
                <GufLoader variant={v.variant} size={56} label={v.name} />
              </div>
              <strong className="text-sm">{v.name}</strong>
              <span className="text-xs leading-4 text-pretty text-fg-secondary">{v.description}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Tamanhos e tons">
        <div className={cn(PANEL, "flex flex-wrap items-end gap-6 p-5")}>
          {LOADER_SIZES.map((px) => (
            <div key={px} className="flex flex-col items-center gap-2">
              <GufLoader size={px} />
              <span className="text-xs text-fg-muted tabular-nums">{px}px</span>
            </div>
          ))}
        </div>
        <div className={cn(PANEL, "flex flex-wrap items-center gap-4 p-5")}>
          <GufLoader variant={8} size={32} tone="brand" label="Tom marca" />
          <span className="text-fg-secondary">
            <GufLoader variant={8} size={32} tone="mono" label="Tom monocromático" />
          </span>
          <span className="grid size-14 place-items-center rounded-md bg-accent">
            <GufLoader variant={8} size={32} tone="onAccent" label="Tom sobre volt" />
          </span>
          <GufLoader variant={2} size={48} wordmark label="Logo animada" />
        </div>
      </Group>

      <Group title="Em uso">
        <div className={cn(PANEL, "flex flex-wrap items-center gap-3 p-5")}>
          <Button loading>Salvando</Button>
          <Button variant="secondary" loading>
            Sincronizando
          </Button>
          <span className="flex h-11 items-center rounded-pill border border-border bg-surface-elevated pr-4 pl-3 shadow-e2">
            <GufLoader size={20} text="Atualizando" />
          </span>
        </div>
        <div className={cn(PANEL, "flex flex-col items-center gap-2 px-4 py-5")}>
          <GufLoader variant={6} size={32} layout="column" text="Carregando mais treinos" textSize={13} />
        </div>
      </Group>

      <Group title="Telas de carregamento">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          <div className="grid gap-2">
            <span className={cn(OVERLINE, "text-fg-muted")}>LoadingScreen · abertura do app</span>
            <div className="relative h-[420px] overflow-hidden rounded-lg border border-border">
              <LoadingScreen placement="container" />
            </div>
          </div>
          <div className="grid gap-2">
            <span className={cn(OVERLINE, "text-fg-muted")}>SavingOverlay · salvando treino (07)</span>
            <div className="relative h-[420px] overflow-hidden rounded-lg border border-border bg-background">
              <SavingOverlay placement="container" />
            </div>
          </div>
        </div>
      </Group>
    </Section>
  );
}

/** 08 · Ícones de grupos musculares (estáticos, animados, zoom) e o filtro por músculo. */
export function MuscleSection({ id }: { id?: string }) {
  const [selected, setSelected] = useState<ReadonlySet<MuscleIconKey>>(() => new Set<MuscleIconKey>(["peito", "triceps"]));
  const toggle = (key: MuscleIconKey) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Section id={id} gap="gap-10">
      <SectionHeader index="08 · Músculos" title="Ícones de grupos musculares">
        Silhueta frontal ou posterior com o grupo trabalhado em volt. Estático para listas e filtros; animado para destaque (pop + duas
        &quot;repetições&quot; a cada 2,4 s). Com movimento reduzido, pulso de opacidade.
      </SectionHeader>

      <Group title="Estáticos">
        <div className={cn(PANEL, "grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-3 p-4")}>
          {MUSCLE_ICON_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <MuscleIcon muscle={key} size={64} animate="none" />
              <span className="text-center text-xs leading-4 font-semibold">{MUSCLE_ICONS[key].name}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Com animação">
        <div className={cn(PANEL, "grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-3 p-4")}>
          {MUSCLE_ICON_KEYS.map((key, i) => (
            <MuscleIcon key={key} muscle={key} size={72} delay={(i % 6) * 140} />
          ))}
        </div>
      </Group>

      <Group title="Zoom no músculo">
        <div className={cn(PANEL, "grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-3 p-4")}>
          {MUSCLE_ICON_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span className="grid size-[72px] place-items-center overflow-hidden rounded-lg border border-border bg-background">
                <MuscleIcon muscle={key} zoom size={70} animate="none" />
              </span>
              <span className="text-center text-xs leading-4 font-semibold">{MUSCLE_ICONS[key].name}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Filtro por músculo">
        <div className="grid max-w-[390px] gap-3.5 rounded-xl border border-border bg-background px-4 pt-5 pb-6">
          <div className="flex items-baseline justify-between px-1">
            <span className={cn(OVERLINE, "text-fg-muted")}>Grupos musculares</span>
            <span className="text-[13px] text-fg-secondary">
              {selected.size === 0 ? "Nenhum selecionado" : selected.size === 1 ? "1 selecionado" : `${selected.size} selecionados`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLE_ICON_KEYS.map((key) => (
              <MuscleFilterTile key={key} muscle={key} selected={selected.has(key)} onToggle={() => toggle(key)} />
            ))}
          </div>
        </div>
      </Group>
    </Section>
  );
}

const FLAME_SIZES = [16, 20, 24, 32, 48];
const FLAME_ANIMATIONS: { id: string; animate: StreakFlameAnimation; title: string; note: string }[] = [
  { id: "A1", animate: "ignite", title: "Acender", note: "Sequência começa. A chama cresce da base e o núcleo aparece logo depois (600 ms)." },
  { id: "A2", animate: "flicker", title: "Tremular", note: "Loop sutil enquanto a sequência está ativa e a semana ainda não foi garantida." },
  { id: "A3", animate: "bump", title: "Somar", note: "Treino finalizado que soma à sequência: a chama pulsa (350 ms)." },
  { id: "A4", animate: "milestone", title: "Marco", note: "Marcos da sequência: brilho e um anel que se expande (800 ms)." },
  { id: "A5", animate: "out", title: "Apagar", note: "Sequência perdida: encolhe, perde o núcleo e fica cinza (600 ms)." },
];

/** 09 · Símbolo da sequência (chama sólida), estados e as 5 animações de evento. */
export function StreakSection({ id }: { id?: string }) {
  const [replay, setReplay] = useState(0);
  const chip = "flex items-center gap-1 rounded-pill py-1 pr-2.5 pl-1.5";
  const number = "font-display text-lg leading-5 font-bold tabular-nums";

  return (
    <Section id={id} gap="gap-10">
      <SectionHeader
        index="09 · Sequência"
        title="Símbolo de sequência"
        action={
          <Button variant="secondary" onClick={() => setReplay((n) => n + 1)}>
            Repetir animações
          </Button>
        }
      >
        Chama sólida em grade 48, cor por currentColor e núcleo vazado por máscara (funciona em qualquer fundo). Mínimo 16px; ao lado do
        número, Barlow Condensed tabular. Com movimento reduzido, vai direto ao estado final.
      </SectionHeader>

      <Group title="Tamanhos e estados">
        <div className={cn(PANEL, "grid gap-5 p-5")}>
          <div className="flex flex-wrap items-end gap-6 text-accent-text">
            {FLAME_SIZES.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1.5">
                <StreakFlame size={size} />
                <span className="text-[11px] text-fg-muted">{size}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn(chip, "border border-border-strong bg-surface-elevated text-accent-text")}>
              <StreakFlame size={20} />
              <span className={cn(number, "text-fg")}>12</span>
            </span>
            <span className={cn(chip, "border border-border bg-surface-elevated text-fg-muted")}>
              <StreakFlame size={20} />
              <span className={number}>0</span>
            </span>
            <span className={cn(chip, "bg-accent text-accent-foreground")}>
              <StreakFlame size={20} />
              <span className={number}>30</span>
            </span>
          </div>
          <span className="text-xs text-fg-muted">Ativo · Sem sequência · Destaque sobre volt</span>
        </div>
      </Group>

      <Group title="Animações">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {FLAME_ANIMATIONS.map((a) => (
            <div key={a.id} className={cn(PANEL, "flex flex-col gap-3 p-3.5")}>
              <div className="flex items-center gap-2">
                <span className="rounded-pill bg-surface-3 px-2 py-0.5 font-display text-sm font-bold">{a.id}</span>
                <span className="text-sm font-semibold">{a.title}</span>
              </div>
              <div className="grid h-[140px] place-items-center rounded-md bg-surface-elevated text-accent-text">
                <StreakFlame key={replay} size={80} animate={a.animate} />
              </div>
              <p className="m-0 text-xs leading-[18px] text-pretty text-fg-muted">{a.note}</p>
            </div>
          ))}
        </div>
      </Group>
    </Section>
  );
}
