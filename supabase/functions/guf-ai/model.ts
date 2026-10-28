// Único ponto que conhece o provedor de IA. Trocar de provedor = trocar este arquivo (e os secrets),
// por exemplo: import { createOpenAI } from "npm:@ai-sdk/openai@…".
// Secrets: GOOGLE_GENERATIVE_AI_API_KEY (obrigatório), GUF_AI_MODEL e GUF_AI_FALLBACK_MODEL (opcionais).
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@4.0.90";
import { wrapLanguageModel } from "npm:ai@7.0.131";

const DEFAULT_MODEL = "gemini-flash-latest";
// Mais leve e menos disputado: no plano gratuito o principal responde 503 (sobrecarregado) com frequência.
const DEFAULT_FALLBACK_MODEL = "gemini-flash-lite-latest";
/** Sobrecarregado (503) ou sem cota (429): vale tentar o modelo reserva na hora. */
const FALLBACK_STATUS = new Set([429, 503]);
/** Pedido recusado: pode ser o ajuste de raciocínio que a geração do modelo não aceita. */
const BAD_REQUEST_STATUS = 400;

// O alias "latest" passou a apontar para um modelo que raciocina sem limite (a resposta chegava vazia).
// O teto de 1024 tokens resolveu, mas vale POR PASSO: uma pergunta com ferramentas tem 2 a 4 passos e
// a resposta demorava muito. Gemini 3 em diante: nível "low"; Gemini 2.x: teto pequeno (512 é o mínimo
// aceito por todos os 2.5, inclusive o flash-lite).
const LEGACY_GEMINI = /^gemini-[12]\./;
const LEGACY_THINKING_BUDGET = 512;
const THINKING_LEVEL = "low";
/** Reserva no limite de saída para o raciocínio (o Gemini conta raciocínio e texto no mesmo limite). */
export const THINKING_RESERVE_TOKENS = 1024;

type ProviderOptions = Record<string, Record<string, unknown>>;
type ThinkingConfig = { thinkingBudget: number } | { thinkingLevel: string } | null;

const statusOf = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode;

function thinkingConfigFor(modelId: string): ThinkingConfig {
  return LEGACY_GEMINI.test(modelId) ? { thinkingBudget: LEGACY_THINKING_BUDGET } : { thinkingLevel: THINKING_LEVEL };
}

/** Mesmos parâmetros com o raciocínio de cada modelo (null = o padrão do modelo). */
function withThinking<P extends { providerOptions?: ProviderOptions }>(params: P, thinkingConfig: ThinkingConfig): P {
  const { thinkingConfig: _previous, ...google } = params.providerOptions?.google ?? {};
  // O spread perde o tipo genérico; a forma é a mesma de params, só com outro google.thinkingConfig.
  return {
    ...params,
    providerOptions: { ...params.providerOptions, google: thinkingConfig ? { ...google, thinkingConfig } : google },
  } as P;
}

/**
 * Chama o modelo com o raciocínio dele; se a geração não aceitar o ajuste (400), tenta uma vez com o
 * padrão do modelo: mais lento, mas responde.
 */
async function callWithThinking<P extends { providerOptions?: ProviderOptions }, R>(
  call: (params: P) => PromiseLike<R>,
  params: P,
  modelId: string,
): Promise<R> {
  try {
    return await call(withThinking(params, thinkingConfigFor(modelId)));
  } catch (error) {
    if (statusOf(error) !== BAD_REQUEST_STATUS) throw error;
    console.warn("GUF AI: ajuste de raciocínio recusado, usando o padrão do modelo", { modelId });
    return call(withThinking(params, null));
  }
}

/** Modelo do GUF AI: o principal e, se ele recusar por sobrecarga ou cota, o reserva. */
export function buildLanguageModel() {
  const google = createGoogleGenerativeAI({ apiKey: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") });
  const primaryId = Deno.env.get("GUF_AI_MODEL") || DEFAULT_MODEL;
  const fallbackId = Deno.env.get("GUF_AI_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL;
  const primary = google(primaryId);
  const fallback = google(fallbackId);
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapStream: async ({ params }) => {
        try {
          return await callWithThinking((p) => primary.doStream(p), params, primaryId);
        } catch (error) {
          if (!FALLBACK_STATUS.has(statusOf(error) ?? 0)) throw error;
          console.warn("GUF AI: modelo principal indisponível, usando o reserva", { statusCode: statusOf(error) });
          return callWithThinking((p) => fallback.doStream(p), params, fallbackId);
        }
      },
      // Conversão de ficha (generateText): mesma troca para o reserva.
      wrapGenerate: async ({ params }) => {
        try {
          return await callWithThinking((p) => primary.doGenerate(p), params, primaryId);
        } catch (error) {
          if (!FALLBACK_STATUS.has(statusOf(error) ?? 0)) throw error;
          console.warn("GUF AI: modelo principal indisponível, usando o reserva", { statusCode: statusOf(error) });
          return callWithThinking((p) => fallback.doGenerate(p), params, fallbackId);
        }
      },
    },
  });
}
