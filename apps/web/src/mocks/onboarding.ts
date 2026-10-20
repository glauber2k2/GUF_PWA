/**
 * MOCK do tour de onboarding — mesmo contrato de @guf/api (OnboardingApi).
 *
 * Usado SÓ em desenvolvimento com ?estado= (as telas de demonstração rodam sem gravar nada).
 * Começa concluído, para o tour não cobrir os estados do design a cada recarga; ?estado=tour
 * simula a conta nova (tour pendente). Guarda na memória: recarregar a página volta ao início.
 */
import type { GufClient, OnboardingApi } from "@guf/api";

const LATENCY_MS = 300;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let completedVersion: number | null = null;
let seeded = false;

/** Define o ponto de partida uma vez por carregamento (pendente = conta nova). */
export function seedTourMock(pending: boolean, currentVersion: number) {
  if (seeded) return;
  seeded = true;
  completedVersion = pending ? null : currentVersion;
}

function ignoreClient(client: GufClient) {
  void client;
}

export const mockOnboardingApi = {
  async getTourProgress(client) {
    ignoreClient(client);
    await wait();
    return { data: { completedVersion }, error: null };
  },
  async completeTour(client, { version }) {
    ignoreClient(client);
    await wait();
    completedVersion = version;
    return { data: null, error: null };
  },
} satisfies OnboardingApi;
