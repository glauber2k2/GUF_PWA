"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "@/shared/helpers/motion";

/** Distância do fim (px) que ainda conta como "no fim" da conversa. */
const NEAR_BOTTOM_PX = 64;

/**
 * Rolagem da conversa: acompanha o fim enquanto a resposta chega, a não ser que a pessoa tenha
 * rolado para cima (aí aparece o botão "Ir para a última mensagem").
 * @param ref área com rolagem
 * @param content valor que muda quando a conversa cresce (ex.: a lista de mensagens)
 */
export function useStickToBottom(ref: RefObject<HTMLDivElement | null>, content: unknown) {
  const isStuck = useRef(true);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && isStuck.current) el.scrollTop = el.scrollHeight;
  }, [ref, content]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    isStuck.current = near;
    setIsAwayFromBottom(!near);
  };

  /** Volta ao fim (pergunta nova ou botão de ir para a última mensagem). */
  const scrollToBottom = () => {
    isStuck.current = true;
    setIsAwayFromBottom(false);
    const el = ref.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return { onScroll, isAwayFromBottom, scrollToBottom };
}
