"use client";

import { useLayoutEffect, useRef } from "react";
import { DEFAULT_MAX_SHEET_SHARE, PEEK_ITEM_SELECTOR, peekListHeight, type PeekItem } from "@/features/app-shell/helpers/peek-height";

function measureItems(list: HTMLElement): PeekItem[] {
  // offsetTop/offsetHeight ignoram o transform da entrada animada; a lista é `relative` (referência do offsetTop).
  return Array.from(list.querySelectorAll<HTMLElement>(PEEK_ITEM_SELECTOR), (item) => ({ top: item.offsetTop, height: item.offsetHeight }));
}

/** Altura do conteúdo da lista (o scrollHeight nunca fica menor que a altura atual, por isso não serve para encolher). */
function measureContentHeight(list: HTMLElement): number {
  const children = Array.from(list.children as HTMLCollectionOf<HTMLElement>);
  const bottom = Math.max(0, ...children.map((child) => child.offsetTop + child.offsetHeight));
  return bottom + parseFloat(getComputedStyle(list).paddingBottom);
}

function fitSheet(sheet: HTMLElement, list: HTMLElement, maxShare: number) {
  const chrome = sheet.offsetHeight - list.clientHeight;
  const available = window.innerHeight * maxShare - chrome;
  const listHeight = peekListHeight(measureItems(list), measureContentHeight(list), available);
  sheet.style.height = `${Math.round(chrome + listHeight)}px`;
}

/**
 * Altura da folha pelo conteúdo, até `maxShare` da tela (padrão 85%): cabe tudo → a folha encolhe; não cabe → o último
 * item visível fica pela metade. Medida quando a lista fica pronta (`measureKey` muda) e ao girar a
 * tela; abrir um item depois não mexe na altura (a lista rola).
 * @param measureKey muda quando a lista pronta muda (null = ainda carregando: fica a altura de agora)
 * @param isEnabled false = a folha volta à altura do próprio conteúdo (ex.: só "retomar treino")
 * @param maxShare teto da folha em fração da altura da tela
 */
export function usePeekSheetHeight(measureKey: string | null, isEnabled: boolean, maxShare = DEFAULT_MAX_SHEET_SHARE) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isEnabled) sheetRef.current?.style.removeProperty("height");
  }, [isEnabled]);

  useLayoutEffect(() => {
    if (measureKey === null) return;
    const fit = () => {
      if (sheetRef.current && listRef.current) fitSheet(sheetRef.current, listRef.current, maxShare);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [measureKey, maxShare]);

  return { sheetRef, listRef };
}
