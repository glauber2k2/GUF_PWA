// =====================================================================
// GUF APP · Edge Function · GUF AI (perguntas sobre os próprios treinos e importação de ficha)
// Chamada pelo app com o token do usuário. Este arquivo só valida origem, método e sessão e
// encaminha o pedido:
//   - { kind: "plan-import", text } → plan-import-handler.ts (ficha → rascunho em JSON, nada gravado);
//   - qualquer outro corpo → chat.ts (useChat → DefaultChatTransport, resposta em stream).
// Publicar: npx supabase functions deploy guf-ai --use-api
// Secrets: GOOGLE_GENERATIVE_AI_API_KEY, GUF_AI_MODEL e GUF_AI_FALLBACK_MODEL (opcionais), ALLOWED_ORIGINS.
// LGPD: nada do conteúdo das conversas nem das fichas vai para os logs.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleChat } from "./chat.ts";
import { corsHeadersFor, isOriginBlocked, textResponse } from "./http.ts";
import { handlePlanImport, isPlanImportBody } from "./plan-import-handler.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeadersFor(origin);

  if (isOriginBlocked(origin)) return textResponse("Origem não autorizada.", 403, cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return textResponse("Método não permitido.", 405, cors);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return textResponse("Entre na sua conta para usar o GUF AI.", 401, cors);

  // Cliente com o token do usuário: toda leitura e gravação passa pelo RLS dele.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user } } = await db.auth.getUser(authorization.replace("Bearer ", ""));
  if (!user) return textResponse("Sua sessão expirou. Entre de novo para usar o GUF AI.", 401, cors);

  const body = await req.json().catch(() => null);
  const context = { db, userId: user.id, cors, signal: req.signal };
  return isPlanImportBody(body) ? handlePlanImport(body, context) : handleChat(body, context);
});
