/** Regras de aceite dos documentos legais (LGPD). Puras, sem React. */

/** Origem gravada em consent_records.source. */
export type ConsentSource = "signup_email" | "signup_google" | "reaccept";

/**
 * Origem do aceite no portão /aceite:
 * - já aceitou algo antes → "reaccept" (documento novo ou versão nova);
 * - primeiro aceite de quem entrou com Google → "signup_google";
 * - primeiro aceite de quem se cadastrou por e-mail → "signup_email"
 *   (caso raro: versão mudou durante o cadastro e o gatilho não registrou).
 */
export function consentSourceFor({
  hasPriorConsent,
  provider,
}: {
  hasPriorConsent: boolean;
  /** user.app_metadata.provider ("google", "email"…). */
  provider: string | null | undefined;
}): ConsentSource {
  if (hasPriorConsent) return "reaccept";
  return provider === "google" ? "signup_google" : "signup_email";
}

/**
 * Quais confirmações pedir conforme os documentos pendentes:
 * - "Tenho 18 anos ou mais" → declaração de idade (age_declaration);
 * - "Li e aceito os Termos de Uso e a Política de Privacidade" → terms e/ou privacy.
 */
export function consentRequirements(pendingDocTypes: readonly string[]): { needsAge: boolean; needsTerms: boolean } {
  return {
    needsAge: pendingDocTypes.includes("age_declaration"),
    needsTerms: pendingDocTypes.includes("terms") || pendingDocTypes.includes("privacy"),
  };
}

const DOC_LABELS: Record<string, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  age_declaration: "Declaração de idade",
  health_consent: "Termo de consentimento de saúde",
};

/** Nome do documento em pt-BR. */
export function legalDocumentLabel(docType: string): string {
  return DOC_LABELS[docType] ?? docType;
}
