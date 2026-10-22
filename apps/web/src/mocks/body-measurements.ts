/**
 * MOCK das medidas corporais — mesmo contrato de @guf/api (BodyMeasurementsApi).
 * Só em DESENVOLVIMENTO, via ?estado= (ver useDevMeasurementsState): padrao · vazio ·
 * sem-consentimento · erro. A memória vale até recarregar a página; nada sai do aparelho.
 */
import { addLocalDays, toLocalISODate, type BodyMeasurementDay, type MeasurementSite } from "@guf/core";
import { apiError, type BodyMeasurementSave, type BodyMeasurementsApi, type BodyMeasurementsOverview, type GufClient } from "@guf/api";

export type MeasurementsMockScenario = "padrao" | "vazio" | "sem-consentimento" | "erro";

const LATENCY_MS = 500;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

/** Medida de partida, ganho por registro e diferença do lado direito (como no protótipo). */
const SEED: Array<{ sites: [MeasurementSite, MeasurementSite] | [MeasurementSite]; base: number; step: number; gap?: number }> = [
  { sites: ["braco_e", "braco_d"], base: 36, step: 0.28, gap: 0.6 },
  { sites: ["antebraco_e", "antebraco_d"], base: 29, step: 0.12, gap: 0.4 },
  { sites: ["coxa_e", "coxa_d"], base: 56, step: 0.32, gap: 0.5 },
  { sites: ["panturrilha_e", "panturrilha_d"], base: 37, step: 0.1, gap: -0.3 },
  { sites: ["peitoral"], base: 102, step: 0.4 },
  { sites: ["ombros"], base: 118, step: 0.45 },
  { sites: ["abdomen"], base: 86, step: -0.45 },
  { sites: ["quadril"], base: 98, step: 0.2 },
];

const SEED_DAYS = 9;
const SEED_INTERVAL_DAYS = 21;

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Gerado sob demanda (nada roda no carregamento do módulo: o build de produção descarta o mock). */
function seedDays(): BodyMeasurementDay[] {
  const today = new Date();
  // O último registro fica 10 dias atrás, como no protótipo.
  const first = addLocalDays(today, -((SEED_DAYS - 1) * SEED_INTERVAL_DAYS + 10));
  return Array.from({ length: SEED_DAYS }, (_, i) => {
    const values: BodyMeasurementDay["values"] = {};
    SEED.forEach((seed, s) => {
      const wobble = Math.sin(i * 1.9 + s) * 0.25;
      const [left, right] = seed.sites;
      values[left] = round1(seed.base + seed.step * i + wobble);
      if (right) values[right] = round1(seed.base + seed.step * i + wobble + (seed.gap ?? 0));
    });
    return { measuredOn: toLocalISODate(addLocalDays(first, i * SEED_INTERVAL_DAYS)), values };
  });
}

let scenario: MeasurementsMockScenario | null = null;
let state: BodyMeasurementsOverview = { hasConsent: true, days: [] };

export function setMeasurementsMockScenario(next: MeasurementsMockScenario) {
  if (next === scenario) return;
  scenario = next;
  state = {
    hasConsent: next !== "sem-consentimento",
    days: next === "padrao" ? seedDays() : [],
  };
}

export const mockBodyMeasurementsApi = {
  async getBodyMeasurements() {
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    return { data: structuredClone(state), error: null };
  },
  async grantHealthConsent() {
    await wait();
    state = { ...state, hasConsent: true };
    return { data: null, error: null };
  },
  async saveBodyMeasurement(_client: GufClient, { measuredOn, values }: BodyMeasurementSave) {
    await wait();
    if (!state.hasConsent) return { data: null, error: apiError("health_consent_required") };
    const current = state.days.find((day) => day.measuredOn === measuredOn)?.values ?? {};
    const next: BodyMeasurementDay["values"] = { ...current };
    for (const [site, value] of Object.entries(values) as Array<[MeasurementSite, number | null]>) {
      if (value === null) delete next[site];
      else next[site] = value;
    }
    const others = state.days.filter((day) => day.measuredOn !== measuredOn);
    const days = Object.keys(next).length ? [...others, { measuredOn, values: next }] : others;
    state = { ...state, days: days.sort((a, b) => a.measuredOn.localeCompare(b.measuredOn)) };
    return { data: null, error: null };
  },
} satisfies BodyMeasurementsApi;
