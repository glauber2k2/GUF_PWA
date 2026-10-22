import { apiError, type AiApi, type AiChatRequest, type AiConversation } from "@guf/api";
import type { UIMessageChunk } from "ai";

/**
 * Mock do GUF AI (mesma assinatura de packages/api/src/ai.ts). Responde em stream com textos do
 * protótipo, escolhidos por palavras da pergunta. Cenários (?estado=, só em dev):
 * ia-conversa (retoma uma conversa) · ia-limite (limite diário) · ia-plano (perguntas do plano Free acabaram)
 * · ia-erro (falha no meio da resposta).
 */
export type AiMockScenario = "ia-conversa" | "ia-limite" | "ia-plano" | "ia-erro";

interface MockReply {
  /** Ferramenta "usada" (mostra o "pensando" e o selo "Usou seu histórico"); null = conhecimento geral. */
  tool: string | null;
  text: string;
}

const REPLIES: Record<string, MockReply> = {
  evolution: {
    tool: "evolucao_do_exercicio",
    text: "Seu supino reto subiu 7,5 kg nas últimas 8 semanas. O recorde atual é 82,5 kg × 6, feito na terça.\n\nPara seguir progredindo, busque 82,5 kg × 8 nas próximas sessões antes de ir para 85 kg.",
  },
  rest: {
    tool: null,
    text: "Para hipertrofia, descanse de 1:30 a 2:00 entre as séries.\n\nEm compostos pesados, como agachamento e supino, até 3:00 ajuda a manter a carga nas últimas séries.\n\nEm isoladores, como crucifixo e tríceps, 1:00 costuma bastar.",
  },
  load: {
    tool: "treinos_recentes",
    text: "Hoje é Treino A. Na última sessão você fez supino reto 80 kg × 10 nas 4 séries, então dá para subir para 82,5 kg.\n\nSe a última série ficar abaixo de 8 repetições, mantenha 82,5 kg na próxima semana.",
  },
  swap: {
    tool: "alternativas_de_exercicio",
    text: "O segundo exercício de hoje foi o supino inclinado com halteres. Boas trocas que trabalham o mesmo grupo:\n\nSupino inclinado na máquina, mais estável se o ombro estiver cansado.\n\nSupino inclinado com barra, para usar mais carga.\n\nCrucifixo inclinado no cabo, se quiser menos peso e mais amplitude.",
  },
  workout: {
    tool: "rotinas",
    text: "Pelo seu Treino A, um bom treino de peito é: supino reto 4 × 8–10 com 80 kg, supino inclinado com halteres 3 × 10–12 com 30 kg, crucifixo no cabo 3 × 12–15 com 15 kg, paralelas 3 × falha e tríceps na corda 3 × 12 com 25 kg.\n\nComece pelo supino reto enquanto está descansado e deixe o crucifixo para o fim.",
  },
  other: {
    tool: null,
    text: "Posso ajudar com os seus treinos, cargas, descanso e evolução.\n\nMe conte um pouco mais sobre o que você quer ajustar.",
  },
};

function pickReply(question: string): MockReply {
  const q = question.toLowerCase();
  if (/substitu|trocar|alternativ/.test(q)) return REPLIES.swap;
  if (/supino|evolu|progre|recorde|1rm|compar/.test(q)) return REPLIES.evolution;
  if (/descans|timer/.test(q)) return REPLIES.rest;
  if (/carga|subir|peso/.test(q)) return REPLIES.load;
  if (/treino|peito|rotina|montar/.test(q)) return REPLIES.workout;
  return REPLIES.other;
}

const THINK_MS = 900;
const TOOL_MS = 700;
const WORD_MS = 40;

/** Última pergunta de cada conversa (para "gerar de novo" responder a mesma coisa); criada sob demanda. */
let lastQuestion: Map<string, string> | null = null;

function scenario(): AiMockScenario | null {
  if (typeof window === "undefined") return null;
  const values = new URLSearchParams(window.location.search).get("estado")?.split(",") ?? [];
  return (["ia-conversa", "ia-limite", "ia-plano", "ia-erro"] as const).find((s) => values.includes(s)) ?? null;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Pedaços do stream na ordem que a Edge Function manda (start → ferramenta → texto → finish). */
async function* replyChunks(reply: MockReply, fail: boolean, signal?: AbortSignal): AsyncGenerator<UIMessageChunk> {
  yield { type: "start", messageId: crypto.randomUUID() };
  await wait(THINK_MS, signal);
  if (reply.tool) {
    const toolCallId = crypto.randomUUID();
    yield { type: "tool-input-available", toolCallId, toolName: reply.tool, input: {} };
    await wait(TOOL_MS, signal);
    yield { type: "tool-output-available", toolCallId, output: {} };
  }
  const id = crypto.randomUUID();
  yield { type: "text-start", id };
  const words = reply.text.split(/(?<= )/);
  for (const [index, word] of words.entries()) {
    if (fail && index === Math.floor(words.length / 2)) {
      yield { type: "error", errorText: apiError("ai_unavailable").message };
      return;
    }
    yield { type: "text-delta", id, delta: word };
    await wait(WORD_MS, signal);
  }
  yield { type: "text-end", id };
  yield { type: "finish" };
}

function toEventStream(chunks: AsyncGenerator<UIMessageChunk>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await chunks.next();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function questionFor(request: AiChatRequest): string {
  lastQuestion ??= new Map();
  if (request.trigger === "submit-message") {
    lastQuestion.set(request.conversationId, request.message.text);
    return request.message.text;
  }
  return lastQuestion.get(request.conversationId) ?? "";
}

const SAMPLE_CONVERSATION = (): AiConversation => ({
  id: crypto.randomUUID(),
  messages: [
    { id: crypto.randomUUID(), role: "user", text: "Como está meu supino?", usedHistory: false, feedback: null },
    { id: crypto.randomUUID(), role: "assistant", text: REPLIES.evolution.text, usedHistory: true, feedback: 1 },
  ],
});

export const mockAiApi = {
  getLatestAiConversation: async () => ({ data: scenario() === "ia-conversa" ? SAMPLE_CONVERSATION() : null, error: null }),
  setAiMessageFeedback: async () => ({ data: null, error: null }),
  streamAiReply: async (_client, { request, signal }) => {
    const current = scenario();
    if (current === "ia-limite" && request.trigger === "submit-message") return { data: null, error: apiError("ai_daily_limit") };
    if (current === "ia-plano" && request.trigger === "submit-message") {
      return { data: null, error: { ...apiError("plan_limit"), feature: "guf_ai_daily_messages" } };
    }
    const stream = toEventStream(replyChunks(pickReply(questionFor(request)), current === "ia-erro", signal));
    return { data: new Response(stream, { headers: { "Content-Type": "text/event-stream" } }), error: null };
  },
} satisfies AiApi;
