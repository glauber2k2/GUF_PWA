// =====================================================================
// GUF APP · Edge Function · Convidar colaborador para o painel (apps/admin)
// Chamada no painel: supabase.functions.invoke('admin-invite-staff', { body: { email, displayName, role } })
// Quem chama precisa ser admin com segundo fator (conferido no banco com o token dele, admin_assert_role).
// A service_role fica só aqui dentro: cria a conta de trabalho (convite do Supabase Auth, link de
// 48 h por padrão) e registra o papel (register_staff_member, auditado como staff_member_added).
// Secrets: ALLOWED_ORIGINS (origem do painel), ADMIN_APP_URL (para onde o link leva),
//          STAFF_EMAIL_DOMAIN (opcional: só e-mails da equipe, ex. guf.app).
// Deploy: npx supabase functions deploy admin-invite-staff --use-api
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const adminAppUrl = (Deno.env.get("ADMIN_APP_URL") ?? "").replace(/\/$/, "");
const staffDomain = (Deno.env.get("STAFF_EMAIL_DOMAIN") ?? "").trim().toLowerCase();

const ROLES = new Set(["viewer", "support", "admin"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = allowedOrigins.length === 0 ? "*" : origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

interface InviteBody {
  email: string;
  displayName: string;
  role: string;
}

function parseBody(raw: unknown): InviteBody | string {
  if (!raw || typeof raw !== "object") return "Dados do convite inválidos.";
  const { email, displayName, role } = raw as Record<string, unknown>;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof displayName === "string" ? displayName.trim() : "";
  if (!EMAIL_PATTERN.test(cleanEmail)) return "Digite um e-mail válido.";
  if (staffDomain && !cleanEmail.endsWith(`@${staffDomain}`)) return `Use o e-mail da equipe, terminado em @${staffDomain}.`;
  if (cleanName.length < 1 || cleanName.length > 80) return "Informe o nome da pessoa (até 80 caracteres).";
  if (typeof role !== "string" || !ROLES.has(role)) return "Escolha um papel.";
  return { email: cleanEmail, displayName: cleanName, role };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return json({ error: "Origem não autorizada" }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (!adminAppUrl) return json({ error: "Convite indisponível: falta configurar ADMIN_APP_URL." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Não autenticado" }, 401);

  // Cliente com o token de quem chama: o banco confere colaborador ativo, admin e aal2.
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { error: roleError } = await caller.rpc("admin_assert_role", { p_role: "admin" });
  if (roleError) return json({ error: "Só admin com segundo fator pode convidar." }, 403);
  const { data: callerUser } = await caller.auth.getUser();

  const body = parseBody(await req.json().catch(() => null));
  if (typeof body === "string") return json({ error: body }, 400);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Conta de trabalho separada da conta pessoal de treino (docs/admin-panel.md §1.2).
  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(body.email, {
    redirectTo: `${adminAppUrl}/primeiro-acesso/`,
    data: { name: body.displayName },
  });
  if (inviteError || !invited.user) {
    const exists = /already|registered|exists/i.test(inviteError?.message ?? "");
    return json(
      { error: exists ? "Esse e-mail já tem conta no guf. Use um e-mail só da equipe." : "Não foi possível enviar o convite. Tente de novo." },
      exists ? 400 : 500,
    );
  }

  const { error: registerError } = await service.rpc("register_staff_member", {
    p_user_id: invited.user.id,
    p_display_name: body.displayName,
    p_role: body.role,
    p_invited_by: callerUser.user?.id ?? null,
  });
  if (registerError) {
    // Sem o papel, a conta convidada não entra no painel; apaga para não sobrar conta órfã.
    await service.auth.admin.deleteUser(invited.user.id);
    return registerError.code === "GA013"
      ? json({ error: "Essa pessoa já faz parte da equipe." }, 409)
      : json({ error: "Não foi possível registrar o colaborador. Tente de novo." }, 500);
  }

  return json({ ok: true });
});
