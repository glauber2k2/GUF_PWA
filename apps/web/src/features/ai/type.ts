import type { AiFeedback } from "@guf/api";
import type { UIMessage } from "ai";

/** Dados de uma mensagem que vieram do banco (respostas novas calculam pelo stream). */
export interface AiMessageMetadata {
  usedHistory?: boolean;
  feedback?: AiFeedback | null;
}

export type AiUIMessage = UIMessage<AiMessageMetadata>;

/** Fase da conversa no cabeçalho e no composer. */
export type AiPhase = "idle" | "thinking" | "streaming";
