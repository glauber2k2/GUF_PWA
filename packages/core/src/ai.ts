/**
 * GUF AI: limites e textos da conversa (os limites se repetem na Edge Function guf-ai).
 * As perguntas por dia dependem do plano (funcionalidade guf_ai_daily_messages, ver plans.ts).
 */

/** Tamanho máximo de uma pergunta. */
export const AI_MESSAGE_MAX_CHARS = 2000;

/** Tempo de cada frase do "pensando" na tela. */
export const AI_THINKING_PHRASE_MS = 2200;

/** Antes de buscar dados (ou em perguntas gerais de musculação). */
const GENERAL_PHRASES = [
  "Pensando na resposta",
  "Entendendo sua pergunta",
  "Consultando princípios de treino",
  "Pesando volume e intensidade",
  "Verificando a coerência",
  "Revisando a resposta",
];

const WORKOUT_PHRASES = [
  "Analisando seus treinos",
  "Somando o volume das séries",
  "Comparando com as últimas sessões",
  "Conferindo cargas e repetições",
];

/** Ferramenta de dados que o GUF AI está usando → frases do que ela está fazendo. */
const TOOL_PHRASES: Record<string, string[]> = {
  resumo_da_conta: ["Consultando sua conta", "Conferindo sua sequência de semanas", "Olhando sua meta semanal"],
  treinos_recentes: WORKOUT_PHRASES,
  detalhe_do_treino: WORKOUT_PHRASES,
  exercicios_treinados: ["Listando seus exercícios", "Contando quantas vezes você treinou cada um"],
  evolucao_do_exercicio: [
    "Analisando sua evolução",
    "Calculando seu 1RM estimado",
    "Procurando seus recordes",
    "Medindo a tendência das cargas",
    "Avaliando a progressão",
  ],
  alternativas_de_exercicio: [
    "Buscando alternativas",
    "Comparando grupos musculares",
    "Conferindo os equipamentos",
    "Escolhendo trocas equivalentes",
  ],
  rotinas: ["Lendo suas rotinas", "Conferindo séries e descanso", "Avaliando a divisão da semana"],
  regras_da_competicao: ["Lendo as regras da competição", "Conferindo como os pontos são somados"],
};

/** Frases que se alternam no "pensando": as da ferramenta em uso ou, sem ferramenta, as gerais. */
export function aiThinkingPhrases(toolName: string | null): string[] {
  return (toolName && TOOL_PHRASES[toolName]) || GENERAL_PHRASES;
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
