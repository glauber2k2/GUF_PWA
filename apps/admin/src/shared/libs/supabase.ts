import { createGufClient, type GufClient } from "@guf/api";

let client: GufClient | null = null;

/**
 * Cliente Supabase do painel (singleton, criado sob demanda). Só a chave PÚBLICA: quem decide o que
 * a equipe vê ou altera são as funções admin_* do banco (papel + segundo fator + auditoria).
 */
export function getSupabaseClient(): GufClient {
  client ??= createGufClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return client;
}
