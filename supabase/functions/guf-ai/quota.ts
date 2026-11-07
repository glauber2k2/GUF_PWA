// Limite diário do GUF AI pelo plano: conferido E registrado no banco numa transação
// (consume_ai_quota, com o token do usuário). Apagar mensagens não devolve cota, "gerar de novo" e
// "tentar de novo" contam e pedidos em paralelo não furam o limite.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Uso que custa uma chamada ao provedor: pergunta (ou reenvio), gerar de novo ou ficha convertida. */
export type AiUsageKind = "chat" | "regenerate" | "plan_import";

export type QuotaCheck = { allowed: true } | { allowed: false; status: number; message: string };

interface QuotaResult {
  allowed: boolean;
  /** Usos em 24 horas; null = sem limite. */
  limit: number | null;
  /** Algum plano à venda libera mais. */
  upgradable: boolean;
}

/**
 * Registra mais um uso se couber no limite. 402 = outro plano libera mais (o app mostra a tela do Pro);
 * 429 = limite máximo; 500 = não deu para conferir (bloqueia: nunca libera sem conferir).
 */
export async function consumeDailyQuota(db: SupabaseClient, kind: AiUsageKind): Promise<QuotaCheck> {
  const { data, error } = await db.rpc("consume_ai_quota", { p_kind: kind });
  if (error || !data) return { allowed: false, status: 500, message: "Não foi possível conferir seu plano. Tente de novo." };
  const quota = data as QuotaResult;
  if (quota.allowed) return { allowed: true };
  return quota.upgradable
    ? { allowed: false, status: 402, message: `Você usou as ${quota.limit} perguntas do seu plano nas últimas 24 horas.` }
    : { allowed: false, status: 429, message: `Você chegou ao limite de ${quota.limit} perguntas em 24 horas. Tente de novo mais tarde.` };
}
