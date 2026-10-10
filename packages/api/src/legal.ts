import type { Database } from "@guf/types";
import { authError, type AuthResult } from "./auth";
import type { GufClient } from "./client";

export type LegalDocument = Database["public"]["Tables"]["legal_documents"]["Row"];

/** Documentos obrigatórios aceitos no cadastro (mesma lista de pending_documents()). */
export const SIGNUP_DOCUMENT_TYPES = ["terms", "privacy", "age_declaration"] as const;
export type SignupDocumentType = (typeof SIGNUP_DOCUMENT_TYPES)[number];

export type SignupDocuments = Record<SignupDocumentType, Pick<LegalDocument, "id" | "doc_type" | "version" | "url">>;

/**
 * Versões vigentes de termos, privacidade e declaração de idade (leitura pública, sem login).
 * Mesma regra de current_legal_document(): a mais recente por published_at.
 */
export async function getSignupDocuments(client: GufClient): Promise<AuthResult<SignupDocuments>> {
  const { data, error } = await client
    .from("legal_documents")
    .select("id, doc_type, version, url, published_at")
    .in("doc_type", [...SIGNUP_DOCUMENT_TYPES])
    .order("published_at", { ascending: false });

  if (error) return { data: null, error: authError(error.message.includes("fetch") ? "network_error" : "unknown") };

  const current: Partial<SignupDocuments> = {};
  for (const doc of data) {
    const type = doc.doc_type as SignupDocumentType;
    current[type] ??= { id: doc.id, doc_type: doc.doc_type, version: doc.version, url: doc.url };
  }
  if (!current.terms || !current.privacy || !current.age_declaration) {
    return { data: null, error: authError("documents_unavailable") };
  }
  return { data: current as SignupDocuments, error: null };
}

/** Documentos obrigatórios ainda não aceitos pelo usuário logado (portão /aceite). */
export async function getPendingDocuments(client: GufClient): Promise<AuthResult<LegalDocument[]>> {
  const { data, error } = await client.rpc("pending_documents");
  if (error) return { data: null, error: authError(error.message.includes("fetch") ? "network_error" : "unknown") };
  return { data: data ?? [], error: null };
}
