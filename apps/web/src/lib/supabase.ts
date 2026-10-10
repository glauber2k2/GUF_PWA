import { createGufClient, type GufClient } from "@guf/api";

let client: GufClient | null = null;

/**
 * Cliente Supabase do navegador (singleton, criado sob demanda).
 * Usa SOMENTE a chave pública: anon (formato antigo) ou publishable (formato novo).
 * A segurança dos dados vem do RLS. NUNCA usar service_role/secret no front.
 */
export function getSupabaseClient(): GufClient {
  client ??= createGufClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );
  return client;
}
