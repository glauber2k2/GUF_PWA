"use client";

import { useSyncExternalStore } from "react";

export type Device = "mobile" | "tablet" | "desktop";

/** Celular até 767 px, tablet até 1199 px, computador daí para cima (protótipo: 390 · 834 · 1440). */
const TABLET_QUERY = "(min-width: 768px)";
const DESKTOP_QUERY = "(min-width: 1200px)";

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(TABLET_QUERY), window.matchMedia(DESKTOP_QUERY)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

function snapshot(): Device {
  if (window.matchMedia(DESKTOP_QUERY).matches) return "desktop";
  return window.matchMedia(TABLET_QUERY).matches ? "tablet" : "mobile";
}

/** Tamanho da tela para escolher o arranjo (tabela × lista, barra lateral × gaveta). */
export function useDevice(): Device {
  return useSyncExternalStore(subscribe, snapshot, () => "desktop");
}
