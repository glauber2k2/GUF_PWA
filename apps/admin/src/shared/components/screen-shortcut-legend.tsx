"use client";

import { KeyboardHints } from "@/shared/components/keyboard-hints";
import { shortcutHint } from "@/shared/helpers/shortcuts";
import { useDevice } from "@/shared/hooks/use-device";
import { useScreenHints } from "@/shared/libs/shortcut-hints";

/**
 * Legenda curta dos atalhos da tela (os mesmos que ela registrou para a ajuda) + "? todos os
 * atalhos". Só no computador; sem atalhos registrados, não aparece.
 */
export function ScreenShortcutLegend() {
  const device = useDevice();
  const hints = useScreenHints();
  if (device !== "desktop" || hints.length === 0) return null;
  return <KeyboardHints hints={[...hints, shortcutHint("help", "todos os atalhos")]} />;
}
