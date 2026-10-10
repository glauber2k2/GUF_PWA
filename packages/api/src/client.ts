import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@guf/types";

export type GufClient = SupabaseClient<Database>;

/**
 * Cria o cliente Supabase tipado. Use SEMPRE a chave anon (pública);
 * a segurança dos dados é garantida pelo RLS no banco.
 */
export function createGufClient(url: string, anonKey: string): GufClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.",
    );
  }
  return createClient<Database>(url, anonKey);
}
