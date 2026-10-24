"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChartLine, Hand } from "lucide-react";
import { findMeasurementPart, partValueLine, type BodyMeasurementDay } from "@guf/core";
import { GufLoader, Icon } from "@/shared/components/ds";
import { prefersReducedMotion } from "@/shared/helpers/motion";
import { cn } from "@/shared/helpers/class-names";
import { measurementPartPath } from "@/features/body-measurements/helpers/paths";
import type { BodyRegion } from "@/features/body-measurements/helpers/body-anatomy";
import type { BodyScene } from "@/features/body-measurements/helpers/body-scene";

/** X Bot do Mixamo (Adobe): uso livre, inclusive comercial, embutido no app (não redistribuir o arquivo solto). */
const BODY_MODEL_URL = "/models/boneco.glb";
/** Onde a linha tracejada do pino encontra o cartão do músculo (px do fundo da área). */
const PIN_LINE_BOTTOM_PX = 78;

type LoadState = "loading" | "ready" | "error";

/**
 * Boneco anatômico 3D (protótipo "Registro de Medidas" · 2a, raio-x) no topo das medidas:
 * arrastar gira; tocar num músculo acende, mostra o pino com o nome e o cartão com a última medida
 * e "Evolução". three.js e Anime.js só baixam quando a tela abre (import dinâmico).
 */
export function MeasurementBody3d({ days }: { days: BodyMeasurementDay[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const sceneRef = useRef<BodyScene | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [picked, setPicked] = useState<BodyRegion | null>(null);
  const part = findMeasurementPart(picked);

  useEffect(() => {
    const stage = stageRef.current;
    const pin = pinRef.current;
    const line = lineRef.current;
    if (!stage || !pin || !line) return;
    let isCurrent = true;
    import("@/features/body-measurements/helpers/body-scene")
      .then(({ mountBodyScene }) =>
        mountBodyScene(stage, {
          modelUrl: BODY_MODEL_URL,
          reducedMotion: prefersReducedMotion(),
          onSelect: setPicked,
          pin,
          pinLine: line,
          pinLineBottomPx: PIN_LINE_BOTTOM_PX,
        }),
      )
      .then((scene) => {
        if (!isCurrent) return scene.destroy();
        sceneRef.current = scene;
        setLoadState("ready");
      })
      .catch(() => {
        if (isCurrent) setLoadState("error");
      });
    // As cores da cena vêm dos tokens: relê quando o tema do app muda.
    const themeObserver = new MutationObserver(() => requestAnimationFrame(() => sceneRef.current?.setTheme()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      isCurrent = false;
      themeObserver.disconnect();
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  const unpick = () => {
    setPicked(null);
    sceneRef.current?.select(null);
  };

  return (
    <div className="relative -mx-1 h-[380px] flex-none overflow-hidden rounded-xl border border-border bg-surface">
      <div
        ref={stageRef}
        role="img"
        aria-label="Boneco anatômico 3D. Arraste para girar e toque num músculo para ver a medida."
        className="absolute inset-0"
      />

      {loadState === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <GufLoader variant={8} size={44} />
        </div>
      )}
      {loadState === "error" && (
        <p className="absolute inset-x-6 top-1/2 m-0 -translate-y-1/2 text-center text-sm leading-5 text-fg-secondary">
          Não foi possível mostrar o boneco 3D neste aparelho. A lista abaixo continua com todas as medidas.
        </p>
      )}

      {/* Pino e linha: a cena move a cada quadro (transform) e liga/desliga por data-visible. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 size-full overflow-visible">
          <path
            ref={lineRef}
            data-visible="false"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            className="stroke-accent-text opacity-0 transition-opacity duration-[250ms] ease-standard data-[visible=true]:opacity-100"
          />
        </svg>
        <div
          ref={pinRef}
          data-visible="false"
          className="group absolute top-0 left-0 -mt-[22px] -ml-[22px] grid size-11 place-items-center opacity-0 transition-opacity duration-200 ease-standard data-[visible=true]:opacity-100"
        >
          <span className="grid size-5 scale-[.4] place-items-center rounded-pill border-[1.5px] border-accent bg-accent transition-transform duration-300 ease-overshoot group-data-[visible=true]:scale-125">
            <span className="size-1.5 rounded-pill bg-accent-foreground" />
          </span>
          <span className="absolute top-1/2 right-[38px] translate-x-1.5 -translate-y-1/2 rounded-pill bg-accent px-2.5 py-1 text-xs leading-4 font-semibold whitespace-nowrap text-accent-foreground opacity-0 transition-[opacity,translate] duration-300 ease-enter group-data-[visible=true]:translate-x-0 group-data-[visible=true]:opacity-100">
            {part?.name}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 grid">
        <div
          className={cn(
            "flex items-center gap-1.5 self-end justify-self-center rounded-pill bg-surface/88 px-3 py-1.5 text-xs leading-4 font-medium text-fg-secondary backdrop-blur-[10px] transition-[opacity,translate] duration-200 ease-standard [grid-area:1/1]",
            part || loadState !== "ready" ? "translate-y-2 opacity-0" : "opacity-100",
          )}
        >
          <Icon icon={Hand} size={14} />
          Toque num músculo · arraste para girar
        </div>
        <div
          aria-live="polite"
          className={cn(
            "flex items-center gap-3 rounded-[14px] bg-surface-elevated py-2.5 pr-2.5 pl-3.5 shadow-e3 transition-[opacity,translate,scale] duration-300 ease-overshoot [grid-area:1/1]",
            part ? "pointer-events-auto opacity-100" : "translate-y-3 scale-[.96] opacity-0",
          )}
        >
          {part && (
            <>
              <button type="button" onClick={unpick} aria-label={`Fechar ${part.name}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-px bg-transparent p-0 text-left text-fg">
                <strong className="text-[15px] leading-5 font-semibold">{part.name}</strong>
                <span className="font-display text-xl leading-6 font-semibold tabular-nums">{partValueLine(days, part)}</span>
              </button>
              <Link
                href={measurementPartPath(part.key)}
                className="flex h-11 flex-none items-center gap-1.5 rounded-md bg-accent px-4 text-[15px] font-semibold text-accent-foreground no-underline"
              >
                <Icon icon={ChartLine} size={16} />
                Evolução
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
