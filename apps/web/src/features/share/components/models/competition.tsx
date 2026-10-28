// Stickers da competição (Claude Design "PNGs Competicao e Cardio" · P01–P15): só o SEU progresso na
// temporada, sem nome nem foto de outros competidores. Fundo transparente (formato sticker); os dados vêm
// de CompetitionStory (packages/core/src/competition-story.ts) e o catálogo só oferece o que existe.
// Adaptações aos dados reais: pontos por semana da temporada (o design mostrava por dia), curva dos pontos
// somados, "posições no fim da temporada" (a posição anterior é a de 70% do período) e sem os modelos
// que pedem dado que o app não guarda (posição semana a semana, pontos por hora, meta de pontos do mês).
import { Crown, ShieldAlert, TrendingUp, Zap } from "lucide-react";
import type { CompetitionStory } from "@guf/core";
import { PointSourceIcon } from "@/shared/components/point-source-icon";
import { cn } from "@/shared/helpers/class-names";
import { StickerLogo } from "./stickers-a";
import { Card, EchoLines, Eyebrow, Header } from "./bold-sticker-parts";
import type { StoryModelProps } from "@/features/share/type";

type Props = StoryModelProps<CompetitionStory>;


/** P01 · Sua posição · subiu. */
export function StoryP01({ d }: Props) {
  return (
    <Card className="gap-[40px]">
      <Header aside={<Eyebrow>COMPETIÇÃO · {d.monthShort}</Eyebrow>} />
      <div className="flex items-end gap-[40px]">
        <span className="font-display text-[360px] leading-[280px] font-bold tracking-[-.03em]">
          <span className="text-accent-text">#</span>
          {d.position}
        </span>
        <div className="flex flex-col gap-[16px] pb-[12px]">
          <span className="flex items-center gap-[12px] self-start rounded-full bg-accent px-[24px] py-[12px] text-[40px] font-bold text-accent-foreground">
            <TrendingUp size={40} aria-hidden="true" />+{d.climbed}
          </span>
          <span className="text-[40px] leading-[48px] font-semibold">
            {d.climbed === 1 ? "posição" : "posições"}
            <br />
            no fim do mês
          </span>
        </div>
      </div>
      <span className="text-[44px] leading-[54px] font-bold tracking-[-.02em] text-pretty">
        {d.position === 1 ? "Subi até o topo do ranking entre amigos." : "Subindo no ranking entre amigos. Bora pro topo."}
      </span>
    </Card>
  );
}

/** P02 · Pontos por semana da temporada. */
export function StoryP02({ d }: Props) {
  return (
    <Card className="gap-[40px]">
      <Header aside={<Eyebrow>{d.monthLabel.toUpperCase()}</Eyebrow>} />
      <div className="flex flex-col gap-[4px]">
        <Eyebrow className="text-accent-text">PONTOS NA TEMPORADA</Eyebrow>
        <span className="flex items-baseline gap-[20px]">
          <span className="font-display text-[200px] leading-[190px] font-bold tracking-[-.02em]">{d.pointsText}</span>
          <span className="font-display text-[64px] font-semibold text-fg-secondary">PTS</span>
        </span>
      </div>
      <div className="flex h-[300px] items-end gap-[20px]">
        {d.weeks.map((w) => (
          <div key={w.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[16px]">
            <span className="font-display text-[34px] font-semibold text-fg-secondary">{w.pointsText}</span>
            {/* Trilho com o espaço que sobra: a barra mede em % dele (sem isso o flex encolhia todas por igual). */}
            <span className="flex min-h-0 w-full flex-1 items-end">
              <span
                className={cn("min-h-[12px] w-full rounded-[20px]", w.isBest ? "bg-accent" : w.pointsText ? "bg-accent/35" : "bg-surface-3")}
                // Altura da barra pela semana (valor dinâmico).
                style={{ height: `${w.heightPct}%` }}
              />
            </span>
            <span className="text-[30px] font-semibold text-fg-secondary">{w.label}</span>
          </div>
        ))}
      </div>
      {d.bestWeekText && (
        <span className="flex items-center gap-[16px] text-[38px] font-semibold">
          <Zap size={40} className="text-accent-text" aria-hidden="true" />
          {d.bestWeekText}
        </span>
      )}
    </Card>
  );
}

/** P04 · Falta pouco pro topo. */
export function StoryP04({ d }: Props) {
  return (
    <Card className="gap-[40px]">
      <Header aside={<Crown size={72} className="text-accent-text" aria-hidden="true" />} />
      <div className="flex flex-col gap-[8px]">
        <Eyebrow>FALTAM SÓ</Eyebrow>
        <span className="flex items-baseline gap-[20px]">
          <span className="font-display text-[240px] leading-[220px] font-bold text-accent-text">{d.gapToFirst}</span>
          <span className="text-[56px] leading-[64px] font-bold tracking-[-.02em]">
            {d.gapToFirst === 1 ? "ponto para" : "pontos para"}
            <br />o 1º lugar
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-[20px]">
        <div className="relative h-[56px] rounded-full bg-surface-3">
          {/* Você até o 1º (valores dinâmicos). */}
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${d.progressToFirstPct}%` }} />
          <span
            className="absolute top-1/2 -mt-[44px] -ml-[44px] box-border size-[88px] rounded-full border-[8px] border-story-accent bg-surface"
            style={{ left: `${d.progressToFirstPct}%` }}
          />
        </div>
        <div className="flex justify-between font-display text-[40px] font-semibold text-fg-secondary">
          <span>{d.pointsText} PTS</span>
          <span>1º LUGAR</span>
        </div>
      </div>
      <span className="text-[44px] leading-[54px] font-bold tracking-[-.02em]">Mais uns treinos e a coroa é minha.</span>
    </Card>
  );
}

/** P05 · Selo do Anel · Top 3. */
export function StoryP05({ d }: Props) {
  return (
    <div className="relative grid size-[760px] place-items-center rounded-full border-2 border-border bg-surface text-fg">
      <svg viewBox="0 0 48 48" className="absolute inset-[40px] size-[calc(100%-80px)]" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="none" className="stroke-story-accent" strokeWidth="2.4" strokeLinecap="round" pathLength="100" strokeDasharray="88 100" transform="rotate(-72 24 24)" />
        <circle cx="24" cy="3" r="1.9" className="fill-story-accent" transform="rotate(-18 24 24)" />
      </svg>
      <div className="flex flex-col items-center gap-[8px]">
        <span className="text-[36px] font-semibold tracking-[.12em] text-accent-text">COMPETIÇÃO</span>
        <span className="font-display text-[200px] leading-[180px] font-bold">TOP 3</span>
        <span className="text-[40px] font-semibold">{d.monthLabel}</span>
        <span className="mt-[20px]">
          <StickerLogo />
        </span>
      </div>
    </div>
  );
}

/** P06 · Recibo de pontos. */
export function StoryP06({ d }: Props) {
  return (
    <Card className="w-[860px] gap-[32px]">
      <Header aside={<span className="text-[32px] font-semibold text-fg-secondary">{d.dateLabel}</span>} />
      <Eyebrow className="text-accent-text">DE ONDE VIERAM MEUS PONTOS</Eyebrow>
      <div className="flex flex-col">
        {d.sources.map((s) => (
            <div key={s.source} className="flex items-center gap-[24px] border-b-2 border-dashed border-border py-[28px]">
              <span className="grid size-[80px] flex-none place-items-center rounded-[20px] bg-surface-3 text-fg-secondary">
                <PointSourceIcon source={s.source} size={40} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="text-[40px] font-semibold">{s.label}</span>
                <span className="text-[32px] text-fg-secondary">{s.detail}</span>
              </span>
              <span className="font-display text-[60px] font-bold">{s.points}</span>
            </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[36px] font-semibold tracking-[.08em]">TOTAL</span>
        <span className="font-display text-[120px] leading-[110px] font-bold text-accent-text">{d.pointsText}</span>
      </div>
    </Card>
  );
}

/** Curva suave pelos pontos somados (0–100), no espaço 0–100 do SVG. */
function curvePath(values: readonly number[]): string {
  const step = 100 / Math.max(1, values.length - 1);
  const points = values.map((v, i) => [i * step, 100 - v * 0.9] as const);
  return points.reduce((path, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = points[i - 1]!;
    const cx = (px + x) / 2;
    return `${path} C${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }, "");
}

/** P08 · Curva de pontos (somados semana a semana). */
export function StoryP08({ d }: Props) {
  const curve = curvePath(d.cumulativePct);
  const endTop = 100 - (d.cumulativePct.at(-1) ?? 0) * 0.9;
  return (
    <Card className="gap-[40px]">
      <Header
        aside={
          d.lastWeekGrowth && (
            <span className="flex items-center gap-[10px] rounded-full bg-accent px-[24px] py-[10px] font-display text-[48px] font-bold text-accent-foreground">
              <TrendingUp size={40} aria-hidden="true" />
              {d.lastWeekGrowth}
            </span>
          )
        }
      />
      <span className="text-[64px] leading-[72px] font-bold tracking-[-.02em]">Somando a cada semana</span>
      <div className="relative h-[360px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <path d="M0 25H100M0 50H100M0 75H100" className="stroke-border" strokeWidth="2" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
          <path d={`${curve} L100 100 L0 100 Z`} className="fill-accent/16" />
          <path d={curve} fill="none" className="stroke-accent" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="absolute -right-[22px] -mt-[22px] box-content size-[44px] translate-x-[8px] -translate-y-[8px] rounded-full border-[8px] border-story-surface bg-accent"
          // Ponto no fim da curva (valor dinâmico).
          style={{ top: `${endTop}%` }}
        />
      </div>
      <div className="flex justify-between font-display text-[36px] font-semibold text-fg-secondary">
        {d.weeks.map((w) => (
          <span key={w.label}>{w.label}</span>
        ))}
      </div>
      <span className="text-[38px] font-semibold">{d.pointsText} pts na temporada</span>
    </Card>
  );
}

/** P09 · Faixa de líder. */
export function StoryP09({ d }: Props) {
  return (
    <div className="py-[40px]">
      <div className="box-border flex w-[960px] -rotate-3 flex-col gap-[24px] rounded-[56px] bg-story-accent px-[64px] py-[56px] text-accent-foreground">
        <div className="flex items-center justify-between">
          <Crown size={96} aria-hidden="true" />
          <span className="text-[34px] font-bold tracking-[.08em]">COMPETIÇÃO · {d.monthShort}</span>
        </div>
        <span className="font-display text-[260px] leading-[220px] font-bold tracking-[-.02em]">1º LUGAR</span>
        <div className="flex items-baseline justify-between border-t-4 border-accent-foreground pt-[24px]">
          <span className="text-[44px] font-bold">Liderando entre amigos</span>
          <span className="font-display text-[64px] font-bold">{d.pointsText} PTS</span>
        </div>
      </div>
    </div>
  );
}

/** P11 · Contagem regressiva (último dia da temporada). */
export function StoryP11({ d }: Props) {
  return (
    <Card className="gap-[32px] border-[3px] border-story-danger">
      <Header
        aside={
          <span className="flex items-center gap-[12px] rounded-full bg-danger/18 px-[24px] py-[10px] text-[32px] font-bold tracking-[.08em] text-danger">
            <span className="size-[18px] rounded-full bg-danger" />
            ACABA HOJE
          </span>
        }
      />
      <Eyebrow>A COMPETIÇÃO FECHA EM</Eyebrow>
      <div className="grid grid-cols-3 gap-[20px]">
        {(d.countdown ?? []).map((c) => (
          <div key={c.unit} className="flex flex-col items-center gap-[4px] rounded-[32px] bg-surface-3 pt-[28px] pb-[20px]">
            <span className="font-display text-[170px] leading-[180px] font-bold">{c.value}</span>
            <span className="text-[30px] font-semibold tracking-[.08em] text-fg-secondary">{c.unit}</span>
          </div>
        ))}
      </div>
      <span className="text-[52px] leading-[60px] font-bold tracking-[-.02em]">
        {d.gapToFirst ? (
          <>
            Faltam <span className="text-accent-text">{d.gapToFirst} pts</span> pro 1º. Dá tempo.
          </>
        ) : (
          "Segurando o 1º lugar até o fim."
        )}
      </span>
    </Card>
  );
}

/** P13 · Vantagem apertada (líder por pouco). */
export function StoryP13({ d }: Props) {
  return (
    <Card className="gap-[36px]">
      <Header aside={<ShieldAlert size={64} className="text-warning" aria-hidden="true" />} />
      <Eyebrow className="text-warning">DEFENDENDO A LIDERANÇA</Eyebrow>
      <span className="flex items-baseline gap-[24px]">
        <span className="font-display text-[280px] leading-[240px] font-bold tracking-[-.02em]">+{d.leadOverSecond}</span>
        <span className="text-[56px] leading-[62px] font-bold">
          {d.leadOverSecond === 1 ? "ponto" : "pontos"}
          <br />
          na frente
        </span>
      </span>
      <div className="flex flex-col gap-[14px]">
        <div className="grid h-[72px] grid-cols-[minmax(0,1fr)_24px] overflow-hidden rounded-full bg-surface-3">
          <span className="bg-accent" />
          <span className="bg-warning" />
        </div>
        <div className="flex justify-between text-[32px] font-semibold text-fg-secondary">
          <span>Meus {d.pointsText} pts</span>
          <span className="text-warning">margem apertada</span>
        </div>
      </div>
      <span className="text-[48px] leading-[56px] font-bold tracking-[-.02em]">Ninguém tira esse 1º lugar de mim.</span>
    </Card>
  );
}

/** P14 · Ultrapassagem. */
export function StoryP14({ d }: Props) {
  return (
    <Card className="gap-[40px] overflow-hidden">
      <Header aside={<Eyebrow>COMPETIÇÃO · {d.monthShort}</Eyebrow>} />
      <span className="inline-block -skew-x-10 font-display text-[150px] leading-[140px] font-bold tracking-[-.01em]">ULTRAPASSEI</span>
      <div className="flex items-center gap-[32px]">
        <span className="font-display text-[220px] leading-[200px] font-bold text-fg-muted line-through decoration-[length:12px]">#{d.previousPosition}</span>
        <div className="flex flex-1 flex-col gap-[14px]">
          <span className="h-[16px] w-3/5 rounded-full bg-accent opacity-35" />
          <span className="h-[16px] w-4/5 rounded-full bg-accent opacity-65" />
          <span className="h-[16px] rounded-full bg-accent" />
        </div>
        <span className="font-display text-[280px] leading-[240px] font-bold text-accent-text">#{d.position}</span>
      </div>
      <span className="text-[44px] leading-[52px] font-bold">{d.position === 1 ? "Cheguei no topo." : "Próxima parada: o topo."}</span>
    </Card>
  );
}

/** P15 · Eco frenético. */
export function StoryP15({ d }: Props) {
  const words = ["NÃO PARO", "NÃO PARO", "NÃO PARO", "NÃO PARO", d.position === 1 ? "NO TOPO" : "ATÉ O 1º"];
  return (
    <Card className="overflow-hidden px-[64px] py-[56px]">
      <EchoLines words={words} size="competition" />
      <div className="mt-[32px] flex items-center justify-between">
        <StickerLogo />
        <span className="text-[36px] font-semibold text-fg-secondary">Competição · semana {d.weekNumber}</span>
      </div>
    </Card>
  );
}
