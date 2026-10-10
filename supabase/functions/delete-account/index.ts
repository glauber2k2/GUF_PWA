// =====================================================================
// GUF APP · Edge Function · Excluir minha conta (LGPD)
// Chamada no app: await supabase.functions.invoke('delete-account', { method: 'POST' })
// A exclusão do usuário em auth.users apaga todos os dados em cascata.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Em produção, troque "*" pelo domínio do app (ex.: https://app.guf.com.br)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  // Variáveis injetadas automaticamente pelo Supabase nas Edge Functions
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Valida o token e identifica o usuário (nunca confiar em um id enviado pelo cliente)
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Sessão inválida" }, 401);

  // PONTO A VALIDAR COM O ADVOGADO:
  // se for definido um registro mínimo de prova dos consentimentos após a exclusão
  // (art. 16 da LGPD), grave-o aqui, em tabela separada, ANTES de excluir o usuário.

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Falha ao excluir conta", { userId: user.id, message: deleteError.message });
    return json({ error: "Não foi possível excluir a conta. Tente novamente." }, 500);
  }

  return json({ ok: true });
});
