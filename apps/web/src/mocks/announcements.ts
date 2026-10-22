/**
 * MOCK dos comunicados no app — mesmo contrato de @guf/api (AnnouncementsApi).
 * Usado SÓ em desenvolvimento com ?estado=aviso-… (ver use-dev-announcements-state). Guarda na
 * memória o que foi fechado: recarregar a página mostra de novo.
 */
import type { AppAnnouncement } from "@guf/core";
import type { AnnouncementsApi, GufClient } from "@guf/api";

export type AnnouncementsMockScenario = "aviso-tela-cheia" | "aviso-modal" | "aviso-toast" | "aviso-faixa" | "aviso-todos";

const LATENCY_MS = 250;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function sample(format: AppAnnouncement["format"]): AppAnnouncement {
  const base = { priority: 50, publishedAt: "2026-10-22T12:00:00Z" };
  switch (format) {
    case "fullscreen":
      return { ...base, id: "mock-full", format, tone: "news", title: "Exporte seu treino em stories", body: "Compartilhe o resumo do treino no Instagram, com sua carga e seus recordes.", ctaLabel: "Experimentar", ctaPath: "/perfil" };
    case "modal":
      return { ...base, id: "mock-modal", format, tone: "info", title: "Atualizamos os Termos de Uso", body: "A partir de 1 nov, valem as novas regras de uso do ranking. Leva 2 minutos para ler.", ctaLabel: "Ler os termos", ctaPath: "/documentos" };
    case "toast":
      return { ...base, id: "mock-toast", format, tone: "success", title: "Treinos sincronizados", body: "Tudo o que você registrou offline já está salvo.", ctaLabel: null, ctaPath: null };
    case "banner":
      return { ...base, id: "mock-banner", format, tone: "warning", title: "Manutenção no domingo, 3h às 4h", body: "O app fica fora do ar por até 1 hora. Seus treinos ficam salvos no aparelho.", ctaLabel: null, ctaPath: null };
  }
}

const SCENARIO_FORMATS: Record<AnnouncementsMockScenario, AppAnnouncement["format"][]> = {
  "aviso-tela-cheia": ["fullscreen"],
  "aviso-modal": ["modal"],
  "aviso-toast": ["toast"],
  "aviso-faixa": ["banner"],
  "aviso-todos": ["fullscreen", "toast", "banner"],
};

let scenario: AnnouncementsMockScenario = "aviso-modal";
const closed = new Set<string>();

export function setAnnouncementsMockScenario(next: AnnouncementsMockScenario) {
  scenario = next;
}

function ignoreClient(client: GufClient) {
  void client;
}

export const mockAnnouncementsApi = {
  async getMyAnnouncements(client) {
    ignoreClient(client);
    await wait();
    return { data: SCENARIO_FORMATS[scenario].map(sample).filter((a) => !closed.has(a.id)), error: null };
  },
  async markAnnouncement(client, { id, event }) {
    ignoreClient(client);
    if (event !== "seen") closed.add(id);
    return { data: null, error: null };
  },
} satisfies AnnouncementsApi;
