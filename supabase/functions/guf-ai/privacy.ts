// Anonimização do texto livre antes de ir para o provedor de IA (LGPD art. 6º, III — necessidade).
// O original fica só no banco do próprio usuário (conversa dele); o modelo recebe a versão sem
// identificadores diretos. Nomes de pessoas em texto livre não são detectáveis com segurança por
// regra: a tela avisa para não escrever dados pessoais.

const REDACTED = "[dado removido]";

const PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,                                  // e-mail
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,                          // CPF
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,                  // CNPJ
  /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g,      // telefone
  /\bhttps?:\/\/\S+/g,                                          // links (podem levar tokens e ids)
  /\b\d{9,}\b/g,                                                // números longos (cartão, documentos)
];

/** Texto sem e-mail, CPF/CNPJ, telefone, links e números longos. */
export function redactPersonalData(text: string): string {
  return PATTERNS.reduce((result, pattern) => result.replace(pattern, REDACTED), text);
}
