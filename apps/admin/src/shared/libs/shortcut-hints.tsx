"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { KeyboardHint } from "@/shared/helpers/shortcuts";

interface ShortcutHintsContextValue {
  screenHints: readonly KeyboardHint[];
  setScreenHints: (hints: readonly KeyboardHint[]) => void;
}

const ShortcutHintsContext = createContext<ShortcutHintsContextValue | null>(null);

/** Guarda os atalhos da tela aberta, que a ajuda ("?") mostra. Montado na moldura do painel. */
export function ShortcutHintsProvider({ children }: { children: ReactNode }) {
  const [screenHints, setScreenHints] = useState<readonly KeyboardHint[]>([]);
  return <ShortcutHintsContext.Provider value={{ screenHints, setScreenHints }}>{children}</ShortcutHintsContext.Provider>;
}

function useShortcutHintsContext(): ShortcutHintsContextValue {
  const context = useContext(ShortcutHintsContext);
  if (!context) throw new Error("Atalhos: a tela precisa estar dentro do ShortcutHintsProvider.");
  return context;
}

/**
 * A tela declara os próprios atalhos (os mesmos que ela liga com os hooks de teclado) para a ajuda.
 * Ao sair da tela, a lista volta a ficar vazia.
 */
export function useScreenShortcutHints(hints: readonly KeyboardHint[]) {
  const { setScreenHints } = useShortcutHintsContext();
  // A lista é recriada a cada render: compara pelo conteúdo para não regravar à toa.
  const signature = JSON.stringify(hints);
  useEffect(() => {
    setScreenHints(JSON.parse(signature) as KeyboardHint[]);
    return () => setScreenHints([]);
  }, [signature, setScreenHints]);
}

/** Atalhos da tela aberta (para a ajuda). */
export function useScreenHints(): readonly KeyboardHint[] {
  return useShortcutHintsContext().screenHints;
}
