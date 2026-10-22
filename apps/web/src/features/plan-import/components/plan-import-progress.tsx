"use client";

import { AI_THINKING_PHRASE_MS, PLAN_IMPORT_PHRASES } from "@guf/core";
import { SavingOverlay } from "@/shared/components/ds";
import { useRotatingPhrase } from "@/shared/hooks/use-rotating-phrase";

/**
 * Enquanto o GUF AI converte a ficha: o que ele está fazendo, em frases que se alternam
 * (mesmo ritmo do "pensando" do chat). O leitor de tela ouve só o título.
 */
export function PlanImportProgress() {
  const phrase = useRotatingPhrase(PLAN_IMPORT_PHRASES, AI_THINKING_PHRASE_MS);
  return (
    <SavingOverlay
      title="Convertendo a ficha"
      variant={8}
      message={
        // Duas linhas reservadas: frases de tamanhos diferentes não fazem a caixa pular.
        <span key={phrase} className="block min-h-10 animate-guf-rise-fast">
          {phrase}…
        </span>
      }
    />
  );
}
