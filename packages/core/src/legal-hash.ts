/**
 * Hash dos textos legais exibidos no app (LGPD: prova de QUAL texto foi aceito).
 *
 * legal_documents.content_hash (e summary_hash do termo de saúde) deve ser igual ao hash
 * calculado aqui a partir de legal-content.ts. Ao publicar uma versão nova por migration,
 * gere os valores com `pnpm --filter @guf/core legal:hashes`.
 *
 * Regra (não mudar sem nova versão de todos os documentos):
 * - SHA-256 em hexadecimal minúsculo do JSON.stringify do conteúdo estruturado;
 * - terms / privacy / health_consent / subscription_terms → documento inteiro (resumo, seções e "o que mudou");
 * - age_declaration → só a seção "idade" dos Termos (onde a declaração é lida);
 * - summary_hash (health_consent) → só o resumo visível (consentimento em camadas).
 *
 * Só imports de tipo: o script de geração roda direto no Node, sem compilar.
 */
import type { LegalDocumentContent, LegalReaderDoc } from "./legal-content";

export type LegalHashDocType = "terms" | "privacy" | "age_declaration" | "health_consent" | "subscription_terms";

export interface LegalHashes {
  content: string;
  summary: string | null;
}

/** Web Crypto e TextEncoder (navegador e Node 20+); o core não carrega a lib DOM. */
interface WebCryptoGlobal {
  crypto: { subtle: { digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer> } };
  TextEncoder: new () => { encode(text: string): Uint8Array };
}

export async function sha256Hex(text: string): Promise<string> {
  const g = globalThis as unknown as WebCryptoGlobal;
  const digest = await g.crypto.subtle.digest("SHA-256", new g.TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Textos que entram no hash de cada documento (ver regra no topo). */
export function legalHashPayloads(
  docs: Record<LegalReaderDoc, LegalDocumentContent>,
): Record<LegalHashDocType, { content: string; summary: string | null }> {
  const ageSection = docs.termos.sections.find((s) => s.id === "idade");
  if (!ageSection) throw new Error('Seção "idade" não encontrada nos Termos de Uso.');
  return {
    terms: { content: JSON.stringify(docs.termos), summary: null },
    privacy: { content: JSON.stringify(docs.privacidade), summary: null },
    age_declaration: { content: JSON.stringify(ageSection), summary: null },
    health_consent: { content: JSON.stringify(docs.saude), summary: JSON.stringify(docs.saude.summary) },
    subscription_terms: { content: JSON.stringify(docs.assinatura), summary: null },
  };
}

export async function legalContentHashes(
  docs: Record<LegalReaderDoc, LegalDocumentContent>,
): Promise<Record<LegalHashDocType, LegalHashes>> {
  const payloads = legalHashPayloads(docs);
  const entries = await Promise.all(
    (Object.keys(payloads) as LegalHashDocType[]).map(async (type) => {
      const { content, summary } = payloads[type];
      return [type, { content: await sha256Hex(content), summary: summary === null ? null : await sha256Hex(summary) }] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<LegalHashDocType, LegalHashes>;
}

/** Documentos cujo hash no banco não confere com o texto do app (null no banco = não publicado, ignora). */
export function legalHashMismatches(
  expected: Record<LegalHashDocType, LegalHashes>,
  stored: Partial<Record<LegalHashDocType, { contentHash: string; summaryHash: string | null }>>,
): LegalHashDocType[] {
  return (Object.keys(expected) as LegalHashDocType[]).filter((type) => {
    const db = stored[type];
    if (!db) return false;
    return db.contentHash !== expected[type].content || db.summaryHash !== expected[type].summary;
  });
}
