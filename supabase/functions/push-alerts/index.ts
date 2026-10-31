// =====================================================================
// GUF APP · Edge Function · Avisos no celular (Web Push): competição e seguidores
// Chamada SÓ pelo banco (gatilhos on_workout_session_competition_alerts e on_follow_push_alert,
// via pg_net), com o cabeçalho x-guf-secret. Publicar sem verificação de JWT (quem chama é o
// banco, não o app):
//   npx supabase functions deploy push-alerts --no-verify-jwt --use-api
// Secrets: PUSH_ALERTS_SECRET (o mesmo do Vault), VAPID_KEYS (JSON com as chaves JWK) e
// VAPID_SUBJECT ("mailto:<contato>"). Ver docs/push-notifications.md.
// LGPD: nada do conteúdo do aviso vai para os logs (só contagens).
// =====================================================================
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { sameSecret } from "../_shared/http.ts";

type FollowKind = "new_follower" | "follow_request" | "request_accepted";

type AlertRequest =
  | { kind: "competition"; user_id: string }
  | { kind: FollowKind; follower_id: string; followee_id: string };

interface CompetitionAlert {
  recipient_id: string;
  rival_id: string;
  rival_name: string | null;
  kind: "close" | "overtaken";
  gap: number;
}

interface FollowAlert {
  recipient_id: string;
  actor_id: string;
  actor_name: string | null;
  actor_handle: string;
  kind: FollowKind;
}

/** Aviso pronto para enviar (texto em português; o service worker só exibe). */
interface PushMessage {
  recipientId: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const FOLLOW_KINDS: FollowKind[] = ["new_follower", "follow_request", "request_accepted"];

// O aviso perde o sentido depois de algumas horas (a posição ou o pedido já pode ter mudado).
const ALERT_TTL_SECONDS = 6 * 60 * 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function pointsLabel(points: number): string {
  return points === 1 ? "1 ponto" : `${points} pontos`;
}

// Mesmo caminho de socialInvitePath (packages/core/src/social.ts).
function personPath(handle: string): string {
  return `/pessoa?u=${encodeURIComponent(handle)}`;
}

function toCompetitionMessage(alert: CompetitionAlert): PushMessage {
  const name = alert.rival_name ?? "Um competidor";
  const base = { recipientId: alert.recipient_id, url: "/competicao", tag: `competition-${alert.rival_id}` };
  if (alert.kind === "overtaken") {
    return {
      ...base,
      title: `${name} te ultrapassou`,
      body: `${name} passou você por ${pointsLabel(alert.gap)} na competição deste mês. Treine para recuperar a posição.`,
    };
  }
  if (alert.gap === 0) {
    return { ...base, title: `${name} empatou com você`, body: "Vocês estão empatados na competição deste mês. O próximo treino decide." };
  }
  return { ...base, title: `${name} está chegando`, body: `${name} está a ${pointsLabel(alert.gap)} de te ultrapassar na competição deste mês.` };
}

function toFollowMessage(alert: FollowAlert): PushMessage {
  const who = alert.actor_name && alert.actor_name !== `@${alert.actor_handle}` ? `${alert.actor_name} (@${alert.actor_handle})` : `@${alert.actor_handle}`;
  const base = { recipientId: alert.recipient_id, tag: `follow-${alert.actor_id}` };
  if (alert.kind === "follow_request") {
    return { ...base, title: "Pedido para seguir", body: `${who} pediu para seguir você.`, url: "/solicitacoes" };
  }
  if (alert.kind === "request_accepted") {
    return { ...base, title: "Pedido aceito", body: `${who} aceitou seu pedido para seguir.`, url: personPath(alert.actor_handle) };
  }
  return { ...base, title: "Novo seguidor", body: `${who} começou a seguir você.`, url: personPath(alert.actor_handle) };
}

async function buildMessages(admin: SupabaseClient, request: AlertRequest): Promise<PushMessage[]> {
  if (request.kind === "competition") {
    const { data, error } = await admin.rpc("compute_competition_alerts", { p_user_id: request.user_id });
    if (error) throw error;
    return ((data ?? []) as CompetitionAlert[]).map(toCompetitionMessage);
  }
  const { data, error } = await admin.rpc("build_follow_alert", {
    p_follower_id: request.follower_id,
    p_followee_id: request.followee_id,
    p_kind: request.kind,
  });
  if (error) throw error;
  return ((data ?? []) as FollowAlert[]).map(toFollowMessage);
}

function isAlertRequest(body: unknown): body is AlertRequest {
  if (!body || typeof body !== "object") return false;
  const { kind, user_id, follower_id, followee_id } = body as Record<string, unknown>;
  if (kind === "competition") return typeof user_id === "string";
  return FOLLOW_KINDS.includes(kind as FollowKind) && typeof follower_id === "string" && typeof followee_id === "string";
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;

function getAppServer(): Promise<webpush.ApplicationServer> {
  appServerPromise ??= webpush
    .importVapidKeys(JSON.parse(Deno.env.get("VAPID_KEYS")!), { extractable: false })
    .then((vapidKeys) => webpush.ApplicationServer.new({ contactInformation: Deno.env.get("VAPID_SUBJECT")!, vapidKeys }));
  return appServerPromise;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const secret = Deno.env.get("PUSH_ALERTS_SECRET");
  if (!secret || !Deno.env.get("VAPID_KEYS") || !Deno.env.get("VAPID_SUBJECT")) {
    return json({ error: "Função não configurada" }, 503);
  }
  if (!sameSecret(req.headers.get("x-guf-secret"), secret)) return json({ error: "Não autorizado" }, 401);

  const request = await req.json().catch(() => null);
  if (!isAlertRequest(request)) return json({ error: "Pedido inválido" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let messages: PushMessage[];
  try {
    messages = await buildMessages(admin, request);
  } catch (e) {
    console.error("Falha ao montar os avisos", { kind: request.kind, code: (e as { code?: string }).code });
    return json({ error: "Falha ao montar os avisos" }, 500);
  }
  if (messages.length === 0) return json({ sent: 0 });

  const recipients = [...new Set(messages.map((message) => message.recipientId))];
  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipients);
  if (subsError) {
    console.error("Falha ao ler os aparelhos inscritos", { code: subsError.code });
    return json({ error: "Falha ao ler os aparelhos" }, 500);
  }

  const appServer = await getAppServer();
  const sentIds: string[] = [];
  const goneIds: string[] = [];
  let failed = 0;

  const deliveries = messages.flatMap((message) =>
    (subscriptions as Subscription[])
      .filter((subscription) => subscription.user_id === message.recipientId)
      .map(async (subscription) => {
        const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: message.tag });
        try {
          await appServer
            .subscribe({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } })
            .pushTextMessage(payload, { ttl: ALERT_TTL_SECONDS, urgency: webpush.Urgency.High });
          sentIds.push(subscription.id);
        } catch (e) {
          // 404/410: o aparelho cancelou a inscrição (app desinstalado, permissão retirada).
          const status = e instanceof webpush.PushMessageError ? e.response.status : null;
          if (status === 404 || status === 410) goneIds.push(subscription.id);
          else failed++;
        }
      }),
  );
  await Promise.all(deliveries);

  if (goneIds.length > 0) await admin.from("push_subscriptions").delete().in("id", goneIds);
  if (sentIds.length > 0) {
    await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).in("id", sentIds);
  }
  if (failed > 0) console.error("Falha ao enviar avisos", { kind: request.kind, failed });

  return json({ sent: sentIds.length, removed: goneIds.length, failed });
});
