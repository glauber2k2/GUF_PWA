"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * Preferência de tema (Escuro · Claro · Sistema), guardada NO APARELHO (não há coluna no banco).
 * Aplicada como data-theme no <html> (tokens em src/styles/tokens/colors.css). O script
 * THEME_BOOT_SCRIPT roda no <head> antes de pintar a tela para não piscar o tema errado.
 */

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "guf.theme";
/** Cor da barra do sistema por tema (tokens --background de cada tema). */
const THEME_COLORS = { dark: "#0B0D10", light: "#F6F7F9" } as const;

/** Script inline do <head>: lê a preferência e aplica o tema antes da primeira pintura. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");var t=p==="light"||p==="dark"?p:p==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}")}catch(e){}})();`;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
}

function resolve(preference: ThemePreference): "dark" | "light" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(preference: ThemePreference) {
  const theme = resolve(preference);
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Sem armazenamento (navegação privada): vale só até fechar.
  }
  apply(preference);
  listeners.forEach((l) => l());
}

/** Preferência atual + troca; em "Sistema", acompanha a mudança de claro/escuro do aparelho. */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readPreference,
    () => "dark" as const,
  );

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return [preference, setThemePreference];
}
