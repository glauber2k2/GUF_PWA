// =====================================================================
// GUF APP · Edge Function · Excluir minha conta (LGPD)
// Chamada no app: await supabase.functions.invoke('delete-account', { method: 'POST' })
// A exclusão do usuário em auth.users apaga todos os dados em cascata.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Sites autorizados a chamar a função (secret ALLOWED_ORIGINS, separados por vírgula):
//   npx supabase secrets set ALLOWED_ORIGINS="https://<app>.vercel.app,http://localhost:3000"
// Sem o secret, aceita qualquer origem (comportamento anterior), para não quebrar o app.
// O CORS é uma camada extra: quem protege a exclusão é a validação do token abaixo.
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = allowedOrigins.length === 0 ? "*" : origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Navegador em site não autorizado: recusa antes de qualquer outra coisa
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return json({ error: "Origem não autorizada" }, 403);
  }
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

  // A prova mínima dos consentimentos (art. 16 da LGPD) é guardada pelo gatilho
  // on_auth_user_deleted_preserve_consents em consent_proofs antes da cascata
  // (migration consent_ledger_hardening; prazo de 5 anos a validar com o jurídico).
  // O registro de auditoria (account_deleted) é gravado pelo gatilho on_auth_user_deleted_audit.

  // Foto enviada (bucket "avatars", pasta <user_id>/): o Storage não apaga em cascata com a conta.
  // Bucket ainda inexistente (upload não implementado) = nada a apagar. Falha ao remover = não exclui
  // a conta, para não deixar arquivos órfãos (o usuário tenta de novo).
  const avatars = admin.storage.from("avatars");
  const { data: files } = await avatars.list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    const { error: removeError } = await avatars.remove(files.map((file) => `${user.id}/${file.name}`));
    if (removeError) {
      console.error("Falha ao apagar a foto na exclusão da conta", { userId: user.id, message: removeError.message });
      return json({ error: "Não foi possível excluir a conta. Tente novamente." }, 500);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Falha ao excluir conta", { userId: user.id, message: deleteError.message });
    return json({ error: "Não foi possível excluir a conta. Tente novamente." }, 500);
  }

  return json({ ok: true });
});
