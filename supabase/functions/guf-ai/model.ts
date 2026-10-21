// Único ponto que conhece o provedor de IA. Trocar de provedor = trocar este arquivo (e o secret),
// por exemplo: import { createOpenAI } from "npm:@ai-sdk/openai@…".
// Secrets: GOOGLE_GENERATIVE_AI_API_KEY (obrigatório) e GUF_AI_MODEL (opcional).
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@4.0.90";

const DEFAULT_MODEL = "gemini-flash-latest";

/** Modelo de linguagem do GUF AI. */
export function buildLanguageModel() {
  const google = createGoogleGenerativeAI({ apiKey: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") });
  return google(Deno.env.get("GUF_AI_MODEL") || DEFAULT_MODEL);
}
