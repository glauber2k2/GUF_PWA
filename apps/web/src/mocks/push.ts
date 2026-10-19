/**
 * MOCK dos avisos no celular — mesmo contrato de @guf/api (PushApi) e um aparelho simulado.
 * Usado SÓ em desenvolvimento com ?estado= em Configurações (o service worker não existe no
 * `next dev`). Nada é enviado nem pedido ao sistema.
 */
import { apiError, type GufClient, type PushApi, type PushSubscriptionKeys } from "@guf/api";
import type { DevicePush } from "@/shared/push/web-push";

const LATENCY_MS = 450;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_SUBSCRIPTION: PushSubscriptionKeys = { endpoint: "https://push.example/guf-dev", p256dh: "dev", auth: "dev" };

let subscribed = false;
let failWrites = false;

/** Gravações falham como erro do servidor (?estado=erro). */
export function setPushMockFailing(failing: boolean) {
  failWrites = failing;
}

function ignoreClient(client: GufClient) {
  void client;
}

export const mockPushApi = {
  savePushSubscription: async (client) => {
    ignoreClient(client);
    await wait();
    return failWrites ? { data: null, error: apiError("unknown") } : { data: null, error: null };
  },
  deletePushSubscription: async (client) => {
    ignoreClient(client);
    await wait();
    return failWrites ? { data: null, error: apiError("unknown") } : { data: null, error: null };
  },
} satisfies PushApi;

export const mockDevicePush = {
  isSupported: () => true,
  getPermission: () => "default",
  getCurrent: async () => (subscribed ? MOCK_SUBSCRIPTION : null),
  subscribe: async () => {
    subscribed = true;
    return MOCK_SUBSCRIPTION;
  },
  unsubscribe: async () => {
    subscribed = false;
  },
} satisfies DevicePush;
