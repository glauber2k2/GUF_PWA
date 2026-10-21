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

const statusOf = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode;

/** Modelo do GUF AI: o principal e, se ele recusar por sobrecarga ou cota, o reserva. */
export function buildLanguageModel() {
  const google = createGoogleGenerativeAI({ apiKey: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") });
  const primary = google(Deno.env.get("GUF_AI_MODEL") || DEFAULT_MODEL);
  const fallback = google(Deno.env.get("GUF_AI_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL);
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (error) {
          if (!FALLBACK_STATUS.has(statusOf(error) ?? 0)) throw error;
          console.warn("GUF AI: modelo principal indisponível, usando o reserva", { statusCode: statusOf(error) });
          return fallback.doStream(params);
        }
      },
    },
  });
}
