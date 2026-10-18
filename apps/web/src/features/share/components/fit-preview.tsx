"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mostra uma arte em tamanho real reduzida para caber na caixa (centralizada), qualquer que seja o
 * formato (story, feed ou sticker). Mede o conteúdo e acompanha mudanças de tamanho.
 */
export function FitPreview({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size && size.w > 0 && size.h > 0 ? Math.min(width / size.w, height / size.h) : 0;
  const left = size ? (width - size.w * scale) / 2 : 0;
  const top = size ? (height - size.h * scale) / 2 : 0;
  return (
    <div
      ref={contentRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 w-max origin-top-left"
      // Escala e posição calculadas pelo tamanho medido (valores dinâmicos); invisível até medir.
      style={{ transform: `translate(${left}px, ${top}px) scale(${scale})`, opacity: size ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
