import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { BillingStore } from "../_shared/billing/store.ts";

/** O que cada ação recebe: a pessoa já conferida pelo token (nunca um id enviado pelo app). */
export interface BillingActionContext {
  userId: string;
  email: string | null;
  /** Cliente com o token da pessoa (RLS e auth.uid()): usado só para os aceites. */
  userClient: SupabaseClient;
  store: BillingStore;
  body: Record<string, unknown>;
  /** Endereço do app (secret APP_URL): nunca vem do pedido, para não virar redirecionamento aberto. */
  appUrl: string;
}

export type BillingAction = (context: BillingActionContext) => Promise<Record<string, unknown>>;
