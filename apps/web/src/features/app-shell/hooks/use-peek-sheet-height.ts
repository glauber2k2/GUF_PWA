"use client";

import { useLayoutEffect, useRef } from "react";
import { peekListHeight, type PeekItem } from "@/features/app-shell/helpers/peek-height";

/** Teto da folha: 85% da altura da tela. */
const MAX_SHEET_SHARE = 0.85;

/** Atributo dos itens que contam para o corte (os outros filhos da lista, como títulos, não). */
export const PEEK_ITEM_PROPS = { "data-peek-item": "" } as const;

function measureItems(list: HTMLElement): PeekItem[] {
  // offsetTop/offsetHeight ignoram o transform da entrada animada; a lista é `relative` (referência do offsetTop).
  return Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-peek-item]"), (item) => ({ top: item.offsetTop, height: item.offsetHeight }));
}

/** Altura do conteúdo da lista (o scrollHeight nunca fica menor que a altura atual, por isso não serve para encolher). */
function measureContentHeight(list: HTMLElement): number {
  const children = Array.from(list.children as HTMLCollectionOf<HTMLElement>);
  const bottom = Math.max(0, ...children.map((child) => child.offsetTop + child.offsetHeight));
  return bottom + parseFloat(getComputedStyle(list).paddingBottom);
}

function fitSheet(sheet: HTMLElement, list: HTMLElement) {
  const chrome = sheet.offsetHeight - list.clientHeight;
  const available = window.innerHeight * MAX_SHEET_SHARE - chrome;
  const listHeight = peekListHeight(measureItems(list), measureContentHeight(list), available);
  sheet.style.height = `${Math.round(chrome + listHeight)}px`;
}

/**
 * Altura da folha pelo conteúdo, até 85% da tela: cabe tudo → a folha encolhe; não cabe → o último
 * item visível fica pela metade. Medida quando a lista fica pronta (`measureKey` muda) e ao girar a
 * tela; abrir um item depois não mexe na altura (a lista rola).
 * @param measureKey muda quando a lista pronta muda (null = ainda carregando: fica a altura de agora)
 * @param isEnabled false = a folha volta à altura do próprio conteúdo (ex.: só "retomar treino")
 */
export function usePeekSheetHeight(measureKey: string | null, isEnabled: boolean) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isEnabled) sheetRef.current?.style.removeProperty("height");
  }, [isEnabled]);

  useLayoutEffect(() => {
    if (measureKey === null) return;
    const fit = () => {
      if (sheetRef.current && listRef.current) fitSheet(sheetRef.current, listRef.current);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [measureKey]);

  return { sheetRef, listRef };
}
