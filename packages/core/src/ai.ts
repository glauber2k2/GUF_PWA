/** GUF AI: limites e textos da conversa (os limites se repetem na Edge Function guf-ai). */

/** Tamanho máximo de uma pergunta. */
export const AI_MESSAGE_MAX_CHARS = 2000;

/** Perguntas por pessoa em 24 horas (o servidor recusa acima disso). */
export const AI_DAILY_MESSAGE_LIMIT = 40;

/** Ferramenta de dados que o GUF AI está usando → texto do "pensando". */
const TOOL_LABELS: Record<string, string> = {
  resumo_da_conta: "Consultando sua conta",
  treinos_recentes: "Analisando seus treinos",
  detalhe_do_treino: "Analisando seus treinos",
  exercicios_treinados: "Analisando seus treinos",
  evolucao_do_exercicio: "Analisando sua evolução",
  alternativas_de_exercicio: "Buscando alternativas",
  rotinas: "Lendo suas rotinas",
};

/** "Pensando" enquanto não há ferramenta; senão o que ela está fazendo. */
export function aiThinkingLabel(toolName: string | null): string {
  return (toolName && TOOL_LABELS[toolName]) || "Pensando";
}

/** "Oi, Glauber" (primeiro nome) ou "Oi" sem nome. */
export function aiGreeting(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Oi, ${first}` : "Oi";
}

const MARKDOWN_NOISE = /\*\*|__|^#{1,6}\s+/gm;
const LIST_MARKER = /^\s*[*-]\s+/gm;

/**
 * Resposta em parágrafos para a tela. O modelo é instruído a não usar Markdown; o que escapar
 * (negrito, títulos, marcadores) vira texto simples.
 */
export function toAnswerParagraphs(text: string): string[] {
  return text
    .replace(MARKDOWN_NOISE, "")
    .replace(LIST_MARKER, "• ")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
