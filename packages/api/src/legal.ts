import type { Database } from "@guf/types";
import type { ConsentSource, LegalHashDocType, LegalReaderDocType } from "@guf/core";
import { authError, type AuthResult, type Platform } from "./auth";
import type { GufClient } from "./client";
import { toApiError, type ApiResult } from "./result";
import { currentUserId } from "./shared";

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

/* =====================================================================
 * Leitor de documentos (/termos, /privacidade, /termo-de-saude) e central /documentos.
 * Versões vigentes são públicas (funciona sem login); o aceite só vem para quem está logado.
 * ===================================================================== */

export interface LegalVersion {
  version: string;
  /** published_at (ISO) — "em vigor desde". */
  publishedAt: string;
  url: string;
}

export interface LegalAcceptedVersion {
  version: string;
  acceptedAt: string;
}

export interface LegalOverview {
  /** Versão vigente de cada documento do leitor (null se não publicado). */
  current: Record<LegalReaderDocType, LegalVersion | null>;
  /** Último aceite em vigor de cada documento; null para visitante (sem sessão). */
  accepted: Record<LegalReaderDocType, LegalAcceptedVersion | null> | null;
}

const READER_TYPES: LegalReaderDocType[] = ["terms", "privacy", "health_consent"];

export async function getLegalOverview(client: GufClient): Promise<ApiResult<LegalOverview>> {
  try {
    const [docsRes, userId] = await Promise.all([
      client
        .from("legal_documents")
        .select("doc_type, version, url, published_at")
        .in("doc_type", READER_TYPES)
        .order("published_at", { ascending: false }),
      currentUserId(client),
    ]);
    if (docsRes.error) return { data: null, error: toApiError(docsRes.error) };

    const current: LegalOverview["current"] = { terms: null, privacy: null, health_consent: null };
    for (const doc of docsRes.data) {
      const type = doc.doc_type as LegalReaderDocType;
      current[type] ??= { version: doc.version, publishedAt: doc.published_at, url: doc.url };
    }
    if (!userId) return { data: { current, accepted: null }, error: null };

    const recordsRes = await client
      .from("consent_records")
      .select("action, created_at, legal_documents(doc_type, version)")
      .order("created_at", { ascending: false });
    if (recordsRes.error) return { data: null, error: toApiError(recordsRes.error) };

    // Registros só são incluídos (nunca editados): vale a ação mais recente de cada tipo
    // (revogar o consentimento de saúde = sem aceite).
    const accepted: NonNullable<LegalOverview["accepted"]> = { terms: null, privacy: null, health_consent: null };
    const seen = new Set<string>();
    for (const record of recordsRes.data) {
      const type = record.legal_documents?.doc_type;
      if (!type || seen.has(type) || !READER_TYPES.includes(type as LegalReaderDocType)) continue;
      seen.add(type);
      if (record.action === "granted" && record.legal_documents) {
        accepted[type as LegalReaderDocType] = { version: record.legal_documents.version, acceptedAt: record.created_at };
      }
    }
    return { data: { current, accepted }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

/* =====================================================================
 * Hash das versões vigentes (conferência do texto exibido × banco; só desenvolvimento)
 * ===================================================================== */

export type CurrentLegalHashes = Partial<Record<LegalHashDocType, { contentHash: string; summaryHash: string | null }>>;

const HASH_TYPES: LegalHashDocType[] = ["terms", "privacy", "age_declaration", "health_consent"];

export async function getCurrentLegalHashes(client: GufClient): Promise<ApiResult<CurrentLegalHashes>> {
  try {
    const { data, error } = await client
      .from("legal_documents")
      .select("doc_type, content_hash, summary_hash, published_at")
      .in("doc_type", HASH_TYPES)
      .order("published_at", { ascending: false });
    if (error) return { data: null, error: toApiError(error) };

    const current: CurrentLegalHashes = {};
    for (const doc of data) {
      current[doc.doc_type as LegalHashDocType] ??= { contentHash: doc.content_hash, summaryHash: doc.summary_hash };
    }
    return { data: current, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}
