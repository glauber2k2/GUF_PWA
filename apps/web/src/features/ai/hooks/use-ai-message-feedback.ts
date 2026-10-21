"use client";

import { useState } from "react";
import type { AiFeedback } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { useAiFeedback } from "@/features/ai/api/use-ai";
import type { AiUIMessage } from "@/features/ai/type";

/** "Útil" / "não ajudou" de cada resposta: muda na hora e grava no banco (volta se falhar). */
export function useAiMessageFeedback() {
  const { showToast } = useAppShell();
  const save = useAiFeedback();
  const [overrides, setOverrides] = useState<Record<string, AiFeedback | null>>({});

  const feedbackOf = (message: AiUIMessage): AiFeedback | null =>
    message.id in overrides ? overrides[message.id] : (message.metadata?.feedback ?? null);

  const toggle = (message: AiUIMessage, value: AiFeedback) => {
    const previous = feedbackOf(message);
    const next = previous === value ? null : value;
    setOverrides((current) => ({ ...current, [message.id]: next }));
    if (next === -1) showToast("Obrigado pelo retorno", { tone: "info", haptic: false });
    save.mutate(
      { messageId: message.id, feedback: next },
      {
        onError: (error) => {
          setOverrides((current) => ({ ...current, [message.id]: previous }));
          showToast("Avaliação não salva", { tone: "error", message: error.message });
        },
      },
    );
  };

  return { feedbackOf, toggle };
}
