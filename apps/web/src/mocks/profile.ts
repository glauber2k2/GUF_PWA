/**
 * MOCK do Perfil — mesmo contrato de @guf/api (ProfileApi).
 *
 * A tela usa os DADOS REAIS (packages/api). Este mock existe só para visualizar os estados do design
 * em DESENVOLVIMENTO, via ?estado= (ver useDevProfileState): padrao · sem-saude · erro.
 * NUNCA chama a exclusão de conta nem a revogação reais.
 */
import { toStoredBio } from "@guf/core";
import { apiError, type Consents, type GufClient, type Profile, type ProfileApi } from "@guf/api";

export type ProfileMockScenario = "padrao" | "sem-saude" | "erro";

let scenario: ProfileMockScenario = "padrao";
let withPhoto = false;
let profile: Profile = seedProfile();
let healthConsent = true;

function seedProfile(): Profile {
  return {
    name: "Rafael Moreira",
    email: "rafael.moreira@email.com",
    avatarUrl: null,
    weightUnit: "kg",
    weeklyGoal: 4,
    autoFinishWorkout: false,
    productAnnouncementsOptOut: false,
    firstTrainedOn: "2026-03-02",
    completedSessions: 48,
    bio: "Treino às 6h antes do trabalho. Foco em força e constância.",
    trainingGoals: ["hypertrophy", "strength"],
    experienceLevel: "intermediate",
    hasUploadedPhoto: false,
  };
}

/** Foto fictícia de ?estado=foto (arquivo local, funciona sem internet). */
const MOCK_PHOTO = "/icons/icon-192.png";

/** Define o cenário (recria os dados ao trocar). */
export function setProfileMockScenario(next: ProfileMockScenario, photo = false) {
  if (photo !== withPhoto) {
    withPhoto = photo;
    profile = { ...profile, avatarUrl: photo ? MOCK_PHOTO : null };
  }
  if (next === scenario) return;
  scenario = next;
  profile = { ...seedProfile(), avatarUrl: withPhoto ? MOCK_PHOTO : null };
  healthConsent = next !== "sem-saude";
}

const LATENCY_MS = 450;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function ignoreClient(client: GufClient) {
  void client;
}

const consents = (): Consents => ({
  healthConsent,
  documents: [
    { docType: "terms", version: "1.0", url: "/termos", acceptedAt: "2026-03-02T12:00:00Z" },
    { docType: "privacy", version: "1.0", url: "/privacidade", acceptedAt: "2026-03-02T12:00:00Z" },
    { docType: "age_declaration", version: "1.0", url: "/termos#idade", acceptedAt: "2026-03-02T12:00:00Z" },
    ...(healthConsent ? [{ docType: "health_consent" as const, version: "1.0", url: "/termo-de-saude", acceptedAt: "2026-03-14T12:00:00Z" }] : []),
  ],
});

export const mockProfileApi = {
  async getProfile(client) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    return { data: { ...profile }, error: null };
  },
  async updateProfile(client, input) {
    ignoreClient(client);
    await wait();
    profile = {
      ...profile,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.bio !== undefined && { bio: toStoredBio(input.bio) }),
      ...(input.trainingGoals !== undefined && { trainingGoals: input.trainingGoals }),
      ...(input.experienceLevel !== undefined && { experienceLevel: input.experienceLevel }),
      ...(input.weightUnit !== undefined && { weightUnit: input.weightUnit }),
      ...(input.weeklyGoal !== undefined && { weeklyGoal: input.weeklyGoal }),
      ...(input.autoFinishWorkout !== undefined && { autoFinishWorkout: input.autoFinishWorkout }),
      ...(input.productAnnouncementsOptOut !== undefined && { productAnnouncementsOptOut: input.productAnnouncementsOptOut }),
    };
    return { data: null, error: null };
  },
  async uploadAvatar(client, image) {
    ignoreClient(client);
    await wait(1200);
    // Só a prévia neste aparelho: o mock não envia nada.
    const url = URL.createObjectURL(image);
    profile = { ...profile, avatarUrl: url, hasUploadedPhoto: true };
    return { data: url, error: null };
  },
  async removeAvatar(client) {
    ignoreClient(client);
    await wait();
    const fallback = withPhoto ? MOCK_PHOTO : null;
    profile = { ...profile, avatarUrl: fallback, hasUploadedPhoto: false };
    return { data: fallback, error: null };
  },
  async getConsents(client) {
    ignoreClient(client);
    await wait();
    return { data: consents(), error: null };
  },
  async revokeHealthConsent(client) {
    ignoreClient(client);
    await wait();
    healthConsent = false;
    return { data: null, error: null };
  },
  async exportMyData(client) {
    ignoreClient(client);
    await wait(1600);
    return {
      data: {
        formato: "guf-export/2",
        exportado_em: new Date().toISOString(),
        conta: { email: profile.email },
        contas_vinculadas: [],
        perfil: { name: profile.name, weight_unit: profile.weightUnit },
        treinos: [],
        periodos_ativos: [],
        consentimentos: [],
        observacao: "Dados fictícios (modo de desenvolvimento).",
      },
      error: null,
    };
  },
  async deleteAccount(client) {
    ignoreClient(client);
    await wait(2000);
    return { data: null, error: null };
  },
} satisfies ProfileApi;
