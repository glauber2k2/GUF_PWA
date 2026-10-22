// Limite diário do GUF AI pelo plano (my_entitlements, com o token do usuário). Contam as perguntas do
// chat (ai_messages, role user) e as fichas convertidas fora do chat (ai_plan_imports), em 24 horas.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Funcionalidade do catálogo de planos (tabela features) com as perguntas por 24 horas. */
const DAILY_MESSAGES_FEATURE = "guf_ai_daily_messages";
const DAY_MS = 86_400_000;

interface DailyQuota {
  /** Usos em 24 horas; null = sem limite. */
  limit: number | null;
  /** Algum plano à venda libera mais. */
  upgradable: boolean;
}

export type QuotaCheck = { allowed: true } | { allowed: false; status: number; message: string };

async function loadDailyQuota(db: SupabaseClient): Promise<DailyQuota | null> {
  const { data, error } = await db.rpc("my_entitlements");
  if (error || !data) return null;
  const feature = (data as { features: Record<string, { limit: number | null; upgradable: boolean }> }).features[DAILY_MESSAGES_FEATURE];
  return feature ? { limit: feature.limit, upgradable: feature.upgradable } : { limit: 0, upgradable: false };
}

async function countUsage(db: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [messages, imports] = await Promise.all([
    db.from("ai_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", since),
    db.from("ai_plan_imports").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
  ]);
  return (messages.count ?? 0) + (imports.count ?? 0);
}

/** Pode fazer mais um uso? 402 = outro plano libera mais (o app mostra a tela do Pro); 429 = limite máximo. */
export async function checkDailyQuota(db: SupabaseClient, userId: string): Promise<QuotaCheck> {
  const quota = await loadDailyQuota(db);
  if (!quota) return { allowed: false, status: 500, message: "Não foi possível conferir seu plano. Tente de novo." };
  if (quota.limit === null) return { allowed: true };
  if ((await countUsage(db, userId)) < quota.limit) return { allowed: true };
  return quota.upgradable
    ? { allowed: false, status: 402, message: `Você usou as ${quota.limit} perguntas do seu plano nas últimas 24 horas.` }
    : { allowed: false, status: 429, message: `Você chegou ao limite de ${quota.limit} perguntas em 24 horas. Tente de novo mais tarde.` };
}
