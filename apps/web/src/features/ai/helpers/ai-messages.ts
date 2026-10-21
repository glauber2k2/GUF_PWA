import type { AiChatRequest, AiMessage } from "@guf/api";
import { isToolUIPart } from "ai";
import type { AiPhase, AiUIMessage } from "@/features/ai/type";

/** Mensagens do banco → formato do useChat. */
export function toUIMessages(messages: AiMessage[]): AiUIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.text }],
    metadata: { usedHistory: m.usedHistory, feedback: m.feedback },
  }));
}

/** Texto da mensagem (todas as partes de texto, na ordem). */
export function getMessageText(message: AiUIMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
}

/** A resposta consultou os dados de treino: veio do banco marcada ou usou uma ferramenta no stream. */
export function hasUsedHistory(message: AiUIMessage): boolean {
  return Boolean(message.metadata?.usedHistory) || message.parts.some(isToolUIPart);
}

/** Ferramenta ainda sem resultado na resposta em andamento (para o texto do "pensando"). */
export function getPendingToolName(message: AiUIMessage | undefined): string | null {
  const pending = message?.parts.filter(isToolUIPart).findLast((part) => part.state !== "output-available");
  return pending ? pending.type.replace(/^tool-/, "") : null;
}

/** Pensando = aguardando ou buscando dados, ainda sem texto; digitando = o texto está chegando. */
export function getAiPhase(status: string, last: AiUIMessage | undefined): AiPhase {
  if (status === "submitted") return "thinking";
  if (status !== "streaming") return "idle";
  const writing = last?.role === "assistant" && getMessageText(last).length > 0 && !getPendingToolName(last);
  return writing ? "streaming" : "thinking";
}

/** Corpo da Edge Function a partir do pedido do useChat (só a pergunta nova; o histórico fica no banco). */
export function toAiChatRequest(options: {
  id: string;
  messages: AiUIMessage[];
  trigger: "submit-message" | "regenerate-message";
}): AiChatRequest {
  if (options.trigger === "regenerate-message") return { conversationId: options.id, trigger: "regenerate-message" };
  const last = options.messages[options.messages.length - 1];
  return {
    conversationId: options.id,
    trigger: "submit-message",
    message: { id: last?.id ?? crypto.randomUUID(), text: last ? getMessageText(last) : "" },
  };
}

