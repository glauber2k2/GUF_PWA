"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Moon, Share2, SquareDashed, Sun } from "lucide-react";
import { m } from "motion/react";
import { storyFileName, type StoryData } from "@guf/core";
import type { ToastOptions } from "@/components/app-shell/app-shell";
import { Banner, BottomSheet, Button, Chip, GufLoader, IconButton, MOTION_EASE, ScreenPortal, SegmentedControl, Skeleton } from "@/components/ds";
import { useShareStory } from "@/hooks/use-share-story";
import { canShareImages, downloadImage, shareImage, storyToPng, StoryExportError } from "@/lib/share/story-export";
import { cn } from "@/lib/utils";
import { FitPreview } from "./fit-preview";
import { StoryArt } from "./story-art";
import { availableStoryModels, STORY_FORMAT_LABELS, STORY_STYLES } from "./story-catalog";
import { STORY_HEIGHT, STORY_WIDTH, type StoryTheme } from "./story-types";

/*
 * Folha "Compartilhar nos Stories" (Claude Design · ShareSheetScreen): estilos em chips, carrossel com
 * as prévias (só os vizinhos são desenhados), tema da imagem (escuro/claro), opacidade do fundo (0 = PNG transparente para colar
 * sobre a foto) e Compartilhar (folha do sistema) / Baixar imagem. A imagem é gerada no aparelho.
 */

/** Aviso depois de baixar a imagem (a tela que abriu a folha mostra). */
export const STORY_SAVED_TOAST: [string, ToastOptions] = [
  "Imagem salva",
  { tone: "success", message: "Está nos downloads do aparelho, pronta para o Instagram." },
];

export interface ShareStorySheetProps {
  open: boolean;
  /** Treino concluído (precisa estar no servidor). */
  sessionId: string | null;
  onClose: () => void;
  /** Só desenvolvimento: usa o mock (?estado=). */
  mockScenario?: string | null;
  /** Imagem baixada (a tela mostra o aviso). */
  onSaved?: () => void;
}

export function ShareStorySheet({ open, sessionId, onClose, mockScenario, onSaved }: ShareStorySheetProps) {
  const story = useShareStory(sessionId, open, mockScenario);
  const models = useMemo(() => (story.data ? availableStoryModels(story.data) : []), [story.data]);
  const [idx, setIdx] = useState(0);
  const ready = Boolean(story.data && models.length > 0);

  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={onClose}
      title="Compartilhar nos Stories"
      subtitle={ready ? `${Math.min(idx, models.length - 1) + 1} de ${models.length}` : undefined}
    >
      {open &&
        (story.data && ready ? (
          <ShareStoryBody data={story.data} models={models} idx={idx} setIdx={setIdx} onSaved={onSaved} />
        ) : story.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void story.refetch()}>
            {story.error.message}
          </Banner>
        ) : (
          <div aria-busy="true" aria-label="Preparando as imagens" className="flex flex-col items-center gap-4 py-2">
            <div className="flex gap-2 self-stretch">
              <Skeleton className="h-8 w-28 rounded-pill" />
              <Skeleton className="h-8 w-24 rounded-pill" />
              <Skeleton className="h-8 w-24 rounded-pill" />
            </div>
            <Skeleton className="h-[288px] w-[162px] rounded-[12px]" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
    </BottomSheet>
  );
}

type Status = "idle" | "busy" | "error";

/** Altura da prévia (px); a arte é 1080 × 1920. */
const PREVIEW_HEIGHT = 288;
const PREVIEW_HEIGHT_ERROR = 220;
const GAP = 12;

const THEME_OPTIONS = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
];

function vibrate() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // ignorar
  }
}

interface ShareStoryBodyProps {
  data: StoryData;
  models: ReturnType<typeof availableStoryModels>;
  /** Modelo atual (fica na folha para o contador do cabeçalho). */
  idx: number;
  setIdx: (i: number) => void;
  onSaved?: () => void;
}

function ShareStoryBody({ data, models, idx, setIdx, onSaved }: ShareStoryBodyProps) {
  const [theme, setTheme] = useState<StoryTheme>("dark");
  const [opacity, setOpacity] = useState(100);
  const [lastOpacity, setLastOpacity] = useState(100);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [canShare] = useState(canShareImages);
  const trackRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const current = models[Math.min(idx, models.length - 1)] ?? models[0]!;
  const previewHeight = status === "error" ? PREVIEW_HEIGHT_ERROR : PREVIEW_HEIGHT;
  const previewWidth = Math.round((previewHeight * STORY_WIDTH) / STORY_HEIGHT);
  const step = previewWidth + GAP;
  const styles = STORY_STYLES.map((label, style) => ({ label, style, first: models.findIndex((mm) => mm.style === style) })).filter(
    (s) => s.first >= 0,
  );

  const go = (i: number) => {
    const next = Math.max(0, Math.min(models.length - 1, i));
    if (next !== idx) vibrate();
    setIdx(next);
    const el = trackRef.current;
    if (el) {
      syncing.current = true;
      el.scrollTo({ left: next * step, behavior: "smooth" });
      window.setTimeout(() => (syncing.current = false), 400);
    }
  };

  // Estilo atual sempre visível na fila de chips.
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>("[data-selected='true']");
    if (row && chip) row.scrollTo({ left: Math.max(0, chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2), behavior: "smooth" });
  }, [current.style]);

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || syncing.current) return;
    const i = Math.round(el.scrollLeft / step);
    if (i !== idx && i >= 0 && i < models.length) {
      vibrate();
      setIdx(i);
    }
  };
  const onTrackKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(idx + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(idx - 1);
    }
  };

  const changeOpacity = (value: number) => {
    setOpacity(value);
    if (value > 0) setLastOpacity(value);
  };

  const run = async (action: "share" | "download") => {
    const node = exportRef.current;
    if (!node || status === "busy") return;
    setStatus("busy");
    setError(null);
    try {
      const blob = await storyToPng(node);
      const name = storyFileName(current.id, data.performedOn);
      if (action === "share") {
        await shareImage(blob, name);
      } else {
        downloadImage(blob, name);
        onSaved?.();
      }
      setStatus("idle");
    } catch (e) {
      setError(e instanceof StoryExportError ? e.message : "Não foi possível gerar a imagem. Tente de novo.");
      setStatus("error");
    }
  };
  const busy = status === "busy";
  const sticker = current.format === "sticker";

  const enter = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, ease: MOTION_EASE.enter, delay: 0.08 + i * 0.06 },
  });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Estilos */}
      <m.div
        {...enter(0)}
        ref={chipsRef}
        role="group"
        aria-label="Estilos. Deslize para ver mais."
        className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pt-0.5 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(90deg,transparent_0,#000_16px,#000_calc(100%-24px),transparent)]"
      >
        {styles.map((s) => (
          <span key={s.label} data-selected={s.style === current.style} className="flex-none">
            <Chip label={s.label} selected={s.style === current.style} onChange={() => go(s.first)} />
          </span>
        ))}
      </m.div>

      {/* Carrossel de modelos */}
      <m.div
        {...enter(1)}
        ref={trackRef}
        onScroll={onTrackScroll}
        onKeyDown={onTrackKey}
        tabIndex={0}
        role="group"
        aria-label="Modelos de imagem. Deslize ou use as setas para trocar."
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto py-1 [scrollbar-width:none] focus-visible:outline-offset-[-2px]"
        // Margem para centralizar a primeira e a última prévia (valor dinâmico).
        style={{ paddingInline: `calc(50% - ${previewWidth / 2}px)` }}
      >
        {models.map((model, i) => {
          const selected = i === idx;
          const near = Math.abs(i - idx);
          return (
            <button
              key={model.id}
              type="button"
              tabIndex={-1}
              aria-label={`Modelo ${model.id}: ${model.name}, ${STORY_STYLES[model.style]}, ${STORY_FORMAT_LABELS[model.format ?? "story"]}`}
              aria-current={selected}
              onClick={() => go(i)}
              className={cn(
                "flex flex-none cursor-pointer snap-center justify-center rounded-[14px] border-0 bg-transparent p-0 transition-[opacity,scale] duration-200 ease-standard",
                selected ? "opacity-100" : near === 1 ? "scale-90 opacity-55" : "scale-90 opacity-30",
              )}
              // Largura da prévia (valor dinâmico: encolhe quando há aviso de erro).
              style={{ width: previewWidth }}
            >
              <m.div
                key={selected ? "on" : "off"}
                initial={selected ? { scale: 0.95 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn(
                  "relative overflow-hidden rounded-[12px] border border-border bg-(image:--story-checker) bg-size-[16px_16px] transition-shadow duration-250 ease-standard",
                  selected && "shadow-e3",
                )}
                // Tamanho da prévia (valor dinâmico).
                style={{ width: previewWidth, height: previewHeight }}
              >
                {near <= 2 && (
                  // Arte em tamanho real reduzida para caber na prévia (story, feed ou sticker).
                  <FitPreview width={previewWidth} height={previewHeight}>
                    <StoryArt model={model} data={data} backgroundOpacity={opacity} theme={theme} />
                  </FitPreview>
                )}
                {busy && selected && (
                  <div className="absolute inset-0 grid place-items-center bg-background/78">
                    <GufLoader variant={4} size={48} text="Gerando imagem" layout="column" />
                  </div>
                )}
              </m.div>
            </button>
          );
        })}
      </m.div>

      {/* Nome do modelo */}
      <m.div {...enter(2)} className="flex items-center justify-between gap-2">
        <IconButton icon={ChevronLeft} label="Modelo anterior" variant="ghost" disabled={idx === 0} onClick={() => go(idx - 1)} />
        <m.div
          key={current.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: MOTION_EASE.standard }}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
        >
          <span className="flex max-w-full min-w-0 items-baseline gap-2">
            <span className="flex-none font-display text-[17px] font-semibold text-accent-text tabular-nums">{current.id}</span>
            <span className="truncate text-[15px] font-semibold">{current.name}</span>
          </span>
          <span className="text-[13px] text-fg-muted">
            {STORY_STYLES[current.style]} · {STORY_FORMAT_LABELS[current.format ?? "story"]}
          </span>
        </m.div>
        <IconButton
          icon={ChevronRight}
          label="Próximo modelo"
          variant="ghost"
          disabled={idx === models.length - 1}
          onClick={() => go(idx + 1)}
        />
      </m.div>

      {/* Tema da imagem */}
      <m.div {...enter(3)} className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Tema da imagem</span>
        <SegmentedControl
          options={THEME_OPTIONS}
          value={theme}
          onChange={(v) => setTheme(v === "light" ? "light" : "dark")}
          size="sm"
          label="Tema da imagem"
        />
      </m.div>

      {/* Opacidade do fundo (sticker já sai sem fundo: a mesma escala vale para o adesivo, de 20 a 100%) */}
      <m.div {...enter(4)} className="flex flex-col gap-1">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <label htmlFor="story-opacity" className="text-sm font-semibold">
            {sticker ? "Opacidade do adesivo" : "Opacidade do fundo"}
          </label>
          {!sticker && (
            <Chip
              label="Sem fundo"
              icon={SquareDashed}
              selected={opacity === 0}
              onChange={(on) => changeOpacity(on ? 0 : lastOpacity || 100)}
            />
          )}
        </div>
        <div className="flex h-11 items-center gap-3">
          <input
            id="story-opacity"
            type="range"
            min={0}
            max={100}
            step={5}
            value={opacity}
            aria-valuetext={`${opacity}%`}
            onChange={(e) => changeOpacity(Number(e.target.value))}
            className="h-11 min-w-0 flex-1 cursor-pointer accent-accent"
          />
          <span className="w-14 text-right font-display text-[22px] font-semibold tabular-nums">{opacity}%</span>
        </div>
      </m.div>

      {status === "error" && error && (
        <Banner tone="danger" title="Imagem não salva." actionLabel="Tentar" onAction={() => setStatus("idle")}>
          {error}
        </Banner>
      )}

      <m.div {...enter(5)} className="flex w-full min-w-0 gap-2">
        {canShare && (
          <IconButton icon={Share2} label="Compartilhar imagem" size="lg" disabled={busy} onClick={() => void run("share")} />
        )}
        <Button
          size="lg"
          icon={Download}
          loading={busy}
          onClick={() => void run("download")}
          className="min-w-0 flex-1"
        >
          {busy ? "Gerando" : "Baixar imagem"}
        </Button>
      </m.div>

      {/* Arte em tamanho real fora da tela: é ela que vira PNG. */}
      <ScreenPortal>
        <div aria-hidden="true" inert className="pointer-events-none fixed top-0 left-[-12000px]">
          <StoryArt ref={exportRef} model={current} data={data} backgroundOpacity={opacity} theme={theme} />
        </div>
      </ScreenPortal>
    </div>
  );
}
