"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, SegmentedControl } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { mockStoryData } from "@/mocks/share";
import { FitPreview } from "@/features/share/components/fit-preview";
import { StoryArt } from "@/features/share/components/story-art";
import { STORY_FORMAT_LABELS, STORY_MODELS, STORY_STYLES, type StoryModel } from "@/features/share/constants/story-catalog";
import { downloadImage, storyToPng } from "@/features/share/helpers/story-export";
import type { StoryTheme } from "@/features/share/type";

/** Caixa de cada prévia (proporção do story 9:16; feed e sticker se encaixam dentro). */
const PREVIEW_WIDTH = 162;
const PREVIEW_HEIGHT = 288;
const THEME_OPTIONS = [
  { value: "dark", label: "Escuro" },
  { value: "light", label: "Claro" },
];
const OPACITY_OPTIONS = [
  { value: "100", label: "100%" },
  { value: "50", label: "50%" },
  { value: "0", label: "0%" },
];

const GROUPS = STORY_STYLES.map((style, index) => ({ style, models: STORY_MODELS.filter((m) => m.style === index) })).filter(
  (group) => group.models.length > 0,
);

/**
 * Galeria de TODOS os PNGs exportáveis (modelos dos stories, cartões, telas cheias e stickers), por
 * estilo — SÓ EM DESENVOLVIMENTO (rota /pngs, página .dev.tsx). Usa os dados de exemplo do mock e
 * mostra também os modelos que, com dados reais, só aparecem quando o dado existe.
 */
export function StoryGalleryScreen() {
  const [data] = useState(mockStoryData);
  const [theme, setTheme] = useState<StoryTheme>("dark");
  const [opacity, setOpacity] = useState(100);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col gap-8 px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-end justify-between gap-4 border-b border-border bg-background/92 px-4 py-3 backdrop-blur-[12px]">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl leading-8 font-bold tracking-[-0.02em]">PNGs exportáveis</h1>
          <p className="m-0 text-sm text-fg-secondary">
            {STORY_MODELS.length} modelos em {GROUPS.length} grupos · dados de exemplo · só em desenvolvimento
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Tema da imagem" size="sm" options={THEME_OPTIONS} value={theme} onChange={(v) => setTheme(v as StoryTheme)} />
          <SegmentedControl label="Opacidade" size="sm" options={OPACITY_OPTIONS} value={String(opacity)} onChange={(v) => setOpacity(Number(v))} />
        </div>
        <nav aria-label="Grupos" className="flex w-full flex-wrap gap-1.5">
          {GROUPS.map((group) => (
            <a
              key={group.style}
              href={`#grupo-${group.style}`}
              className="rounded-pill border border-border-strong px-3 py-1 text-xs font-medium text-fg no-underline hover:bg-surface-3"
            >
              {group.style} · {group.models.length}
            </a>
          ))}
        </nav>
      </header>

      {GROUPS.map((group) => (
        <section key={group.style} id={`grupo-${group.style}`} aria-label={group.style} className="flex scroll-mt-40 flex-col gap-3">
          <h2 className="m-0 text-lg leading-6 font-semibold">
            {group.style} <span className="font-normal text-fg-muted">· {group.models.length}</span>
          </h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,162px)] gap-4 p-0">
            {group.models.map((model) => (
              <StoryGalleryItem key={model.id} model={model} theme={theme} opacity={opacity} data={data} isAvailable={model.available?.(data) ?? true} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function StoryGalleryItem({
  model,
  theme,
  opacity,
  data,
  isAvailable,
}: {
  model: StoryModel;
  theme: StoryTheme;
  opacity: number;
  data: ReturnType<typeof mockStoryData>;
  isAvailable: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [artNode, setArtNode] = useState<HTMLDivElement | null>(null);

  const download = async () => {
    if (!artNode) return;
    setBusy(true);
    setFailed(false);
    try {
      downloadImage(await storyToPng(artNode), `guf-story-${model.id}-${theme}.png`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-[12px] border border-border bg-(image:--story-checker) bg-size-[16px_16px]"
        // Tamanho da prévia (constante, mas o FitPreview mede por ele).
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      >
        <FitPreview width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}>
          <StoryArt ref={setArtNode} model={model} data={data} backgroundOpacity={opacity} theme={theme} />
        </FitPreview>
      </div>
      <div className="flex flex-col gap-0.5">
        <strong className="text-sm leading-5">
          {model.id} · {model.name}
        </strong>
        <span className="text-xs text-fg-muted">
          {model.Component.displayName ?? model.Component.name} · {STORY_FORMAT_LABELS[model.format ?? "story"]}
          {model.hasCards ? " · com cartões" : ""}
        </span>
        <span className={cn("text-xs", isAvailable ? "text-fg-muted" : "text-warning")}>
          {isAvailable ? "Disponível com estes dados" : "Só aparece quando o dado existe"}
        </span>
      </div>
      <Button variant="secondary" size="md" icon={Download} loading={busy} disabled={!artNode} onClick={() => void download()}>
        {failed ? "Falhou · tentar de novo" : "Baixar PNG"}
      </Button>
    </li>
  );
}
