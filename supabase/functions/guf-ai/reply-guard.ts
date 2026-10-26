// Resposta que termina sem texto vira erro na tela. O app só mostra aviso com uma parte "error":
// o tempo limite do AI SDK chega como "abort" (o mesmo de quando a pessoa para) e uma resposta vazia
// (raciocínio que gastou todos os tokens, filtro do provedor) chega como "finish" normal. Nos dois
// casos a tela saía do "pensando" sem resposta e sem aviso.
import type { FinishReason, UIMessageChunk } from "npm:ai@7.0.131";

const TIMEOUT_MESSAGE = "O GUF AI demorou demais para responder. Tente de novo em instantes. (código tempo)";

const EMPTY_REPLY_MESSAGES: Partial<Record<FinishReason, string>> = {
  length: "A resposta do GUF AI ficou longa demais e foi interrompida. Tente de novo ou peça algo mais curto. (código length)",
  "content-filter": "O GUF AI não pode responder a essa pergunta. Tente escrever de outro jeito. (código content-filter)",
};
const EMPTY_REPLY_FALLBACK = "O GUF AI não conseguiu montar uma resposta agora. Tente de novo em instantes. (código vazio)";

/**
 * Transforma o fim sem resposta em parte "error" (com o motivo no log, sem conteúdo da conversa).
 * @param clientSignal pedido do app: abortado = a pessoa parou ou saiu, e o "abort" segue como está.
 */
export function guardEmptyReply(clientSignal: AbortSignal): TransformStream<UIMessageChunk, UIMessageChunk> {
  let hasText = false;
  let hasError = false;
  // A conversão de ficha responde com o cartão "Revisar e criar", que conta como resposta.
  let hasToolOutput = false;

  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type === "text-delta" && chunk.delta.trim()) hasText = true;
      if (chunk.type === "error") hasError = true;
      if (chunk.type === "tool-output-available") hasToolOutput = true;

      if (chunk.type === "abort" && !clientSignal.aborted) {
        console.error("GUF AI: resposta interrompida", { reason: chunk.reason?.slice(0, 120), hasText });
        controller.enqueue({ type: "error", errorText: TIMEOUT_MESSAGE });
        return;
      }
      if (chunk.type === "finish" && !hasText && !hasError && !hasToolOutput) {
        console.error("GUF AI: resposta vazia", { finishReason: chunk.finishReason });
        const reason = chunk.finishReason;
        controller.enqueue({ type: "error", errorText: (reason && EMPTY_REPLY_MESSAGES[reason]) ?? EMPTY_REPLY_FALLBACK });
      }
      controller.enqueue(chunk);
    },
  });
}
