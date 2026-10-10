import type { Database } from "@guf/types";
import type { ConsentSource } from "@guf/core";
import { authError, type AuthResult, type Platform } from "./auth";
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

/** O usuário logado já registrou algum aceite? (define "reaccept" no portão /aceite) */
export async function hasPriorConsent(client: GufClient): Promise<AuthResult<boolean>> {
  const { count, error } = await client
    .from("consent_records")
    .select("id", { count: "exact", head: true })
    .eq("action", "granted");
  if (error) return { data: null, error: authError(error.message.includes("fetch") ? "network_error" : "unknown") };
  return { data: (count ?? 0) > 0, error: null };
}

export interface AcceptDocumentsInput {
  /** Ids das versões vigentes exibidas na tela (pending_documents). */
  documentIds: string[];
  source: ConsentSource;
  platform: Platform;
}

/**
 * Registra o aceite (accept_documents). O banco só aceita versões VIGENTES de
 * terms, privacy e age_declaration; versão desatualizada → "documents_outdated".
 */
export async function acceptDocuments(
  client: GufClient,
  { documentIds, source, platform }: AcceptDocumentsInput,
): Promise<AuthResult<null>> {
  if (documentIds.length === 0) return { data: null, error: null };
  const { error } = await client.rpc("accept_documents", {
    p_document_ids: documentIds,
    p_source: source,
    p_platform: platform,
  });
  if (!error) return { data: null, error: null };
  if (error.code === "22023") return { data: null, error: authError("documents_outdated") };
  return { data: null, error: authError(error.message.includes("fetch") ? "network_error" : "unknown") };
}
