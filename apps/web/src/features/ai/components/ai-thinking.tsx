"use client";

import { AI_THINKING_PHRASE_MS } from "@guf/core";
import { GufLoader } from "@/shared/components/ds";
import { useRotatingPhrase } from "@/features/ai/hooks/use-rotating-phrase";

/**
 * "Pensando" do GUF AI: frases que se alternam enquanto a resposta não começa.
 * O leitor de tela ouve só "GUF AI está pensando" (as trocas são visuais).
 */
export function AiThinking({ phrases }: { phrases: string[] }) {
  const phrase = useRotatingPhrase(phrases, AI_THINKING_PHRASE_MS);
  return (
    <div className="flex animate-guf-rise-fast items-center gap-2.5">
      <GufLoader
        variant={8}
        size={18}
        tone="brand"
        label="GUF AI está pensando"
        textSize={14}
        text={
          <span key={phrase} aria-hidden="true" className="inline-block animate-guf-rise-fast">
            {phrase}…
          </span>
        }
      />
    </div>
  );
}
