import { createGufClient, type GufClient } from "@guf/api";
import { reportAccountSuspension } from "@/store/global/account-suspension.store";

let client: GufClient | null = null;

/**
 * Cliente Supabase do navegador (singleton, criado sob demanda — nunca durante o
 * pré-render estático). As variáveis NEXT_PUBLIC_* precisam aparecer literalmente
 * aqui para o Next embuti-las no build.
 */
export function getSupabaseClient(): GufClient {
  client ??= createGufClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    onAccountSuspended: reportAccountSuspension,
  });
  return client;
}
