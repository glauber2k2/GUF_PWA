import type { ApiError } from "@guf/api";

/** Falha da API dentro do transporte do AI SDK (que só repassa `Error`): guarda o código do app. */
export class AiRequestError extends Error {
  constructor(readonly apiError: ApiError) {
    super(apiError.message);
    this.name = "AiRequestError";
  }
}
