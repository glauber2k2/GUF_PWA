/**
 * Dados FICTÍCIOS do painel (só desenvolvimento, ?estado=). Pessoas e equipe inventadas, como no
 * protótipo. Gerados sob demanda (nada roda no carregamento do módulo: o build descarta o mock).
 */
import type { AdminAnnouncementSummary, AdminUserDetail, AnnouncementDraft, AuditEntry, StaffRow } from "@guf/api/admin";
import type { StaffRole } from "@guf/core";
import type { DevAccess } from "@/shared/hooks/use-dev-admin-state";

export interface MockScenario {
  role: StaffRole;
  access: DevAccess;
  forceError: boolean;
  empty: boolean;
}

export interface MockAnnouncement {
  summary: AdminAnnouncementSummary;
  draft: AnnouncementDraft;
  targetIds: string[];
  publishedAt: string | null;
}

export interface MockDb {
  people: AdminUserDetail[];
  announcements: MockAnnouncement[];
  staff: StaffRow[];
  audit: AuditEntry[];
}

export const MOCK_ME_ID = "00000000-0000-4000-8000-000000000001";

let scenario: MockScenario = { role: "admin", access: "ready", forceError: false, empty: false };
let db: MockDb | null = null;

export function setAdminMockScenario(next: MockScenario) {
  scenario = next;
}

export function getAdminMockScenario(): MockScenario {
  return scenario;
}

const day = (offset: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};

function person(id: string, name: string, handle: string, email: string, plan: "free" | "pro", createdDaysAgo: number, isPrivate: boolean): AdminUserDetail {
  return {
    userId: id,
    name,
    handle,
    isPrivate,
    maskedEmail: email,
    createdAt: day(-createdDaysAgo),
    lastSignInAt: day(0, 8),
    hasPassword: true,
    logins: [
      { provider: "email", createdAt: day(-createdDaysAgo) },
      { provider: "google", createdAt: day(-createdDaysAgo + 2) },
    ],
    plan: plan === "pro" ? { code: "pro", name: "Pro", isDefault: false } : { code: "free", name: "Free", isDefault: true },
    planGrants:
      plan === "pro"
        ? [{ id: `${id}-g1`, planCode: "pro", planName: "Pro", source: "manual", validFrom: day(-10), validUntil: day(355), revokedAt: null }]
        : [],
    followers: 284,
    following: 131,
    workouts: 96,
    documents: [
      { docType: "terms", version: "0.5-dev", acceptedAt: day(-40) },
      { docType: "privacy", version: "0.7-dev", acceptedAt: day(-40) },
      { docType: "age_declaration", version: "0.1-dev", acceptedAt: day(-200) },
    ],
    healthConsent: true,
    staffActivity: [
      { id: 7, occurredAt: day(0, 10), staffName: "Lucas Ferreira", action: "staff_revealed_email", reason: null, note: null },
      { id: 4, occurredAt: day(-10, 15), staffName: "Paula Mendes", action: "staff_changed_plan", reason: "courtesy", note: null },
    ],
  };
}

function draft(partial: Partial<AnnouncementDraft>): AnnouncementDraft {
  return {
    title: "",
    body: "",
    format: "modal",
    tone: "news",
    ctaLabel: null,
    ctaPath: null,
    audience: { rules: [{ type: "all" }] },
    purpose: "service",
    priority: 50,
    frequency: "until_dismissed",
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

function announcement(id: string, state: AdminAnnouncementSummary["state"], d: AnnouncementDraft, stats: [number, number, number, number]): MockAnnouncement {
  const [reach, seen, dismissed, cta] = stats;
  return {
    draft: d,
    targetIds: [],
    publishedAt: state === "draft" ? null : day(-20, 18),
    summary: {
      id,
      title: d.title,
      tone: d.tone,
      format: d.format,
      audience: d.audience,
      purpose: d.purpose,
      state,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      reachEstimate: state === "draft" ? null : reach,
      seenCount: seen,
      dismissedCount: dismissed,
      ctaCount: cta,
      targetsCount: 0,
      updatedAt: day(-1),
    },
  };
}

function seed(): MockDb {
  const people = [
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e01", "Marina Alves Costa", "marina.treina", "ma•••@gmail.com", "pro", 400, false),
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e02", "Marcos Vieira", "marcos.v", "mv•••@outlook.com", "free", 19, true),
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e03", "Thiago Martins", "thiago.mts", "th•••@gmail.com", "pro", 274, false),
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e04", "Ana Marques", "anamarques", "an•••@icloud.com", "pro", 470, true),
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e05", "Mariana Souza", "mari.souza", "ms•••@gmail.com", "free", 7, false),
    person("6b1f3c2e-8a4d-4f1e-9c2b-1a2b3c4d5e06", "Rafael Nunes", "rafa.nunes", "rn•••@gmail.com", "free", 22, false),
  ];
  const lastPerson = people[people.length - 1];
  if (lastPerson) lastPerson.logins = [{ provider: "google", createdAt: lastPerson.createdAt }];
  if (lastPerson) lastPerson.hasPassword = false;

  const announcements = [
    announcement("a0000000-0000-4000-8000-000000000001", "active", draft({ title: "Novo: exporte seu treino em stories", body: "Compartilhe o resumo do treino no Instagram, com sua carga e seus recordes.", ctaLabel: "Experimentar", ctaPath: "/perfil", purpose: "product", startsAt: day(-21), endsAt: day(9) }), [18420, 12905, 8311, 3112]),
    announcement("a0000000-0000-4000-8000-000000000002", "active", draft({ title: "Manutenção no domingo, 3h às 4h", body: "O app fica fora do ar por até 1 hora. Seus treinos ficam salvos no aparelho.", format: "banner", tone: "warning", startsAt: day(-2), endsAt: day(4) }), [9870, 7214, 2100, 0]),
    announcement("a0000000-0000-4000-8000-000000000003", "scheduled", draft({ title: "Atualizamos os Termos de Uso", body: "A partir de 1 nov, valem as novas regras de uso do ranking. Leva 2 minutos para ler.", format: "fullscreen", tone: "info", purpose: "legal", ctaLabel: "Ler os termos", ctaPath: "/documentos", startsAt: day(10, 9), endsAt: day(39) }), [48230, 0, 0, 0]),
    announcement("a0000000-0000-4000-8000-000000000004", "draft", draft({ title: "Medidas: nova tela de registro", body: "Registre suas circunferências e veja a evolução por músculo.", format: "fullscreen", audience: { rules: [{ type: "health_consent" }] }, purpose: "service" }), [0, 0, 0, 0]),
    announcement("a0000000-0000-4000-8000-000000000005", "ended", draft({ title: "Ranking semanal chegou", body: "Siga amigos e dispute a pontuação da semana.", audience: { rules: [{ type: "visibility", value: "open" }] }, startsAt: day(-60), endsAt: day(-30) }), [21004, 17330, 9000, 6902]),
  ];

  const staff: StaffRow[] = [
    { userId: MOCK_ME_ID, displayName: "Ana Ribeiro", email: "ana.ribeiro@guf.app", role: "admin", hasVerifiedFactor: true, status: "active", lastSeenAt: day(0), isMe: true },
    { userId: "00000000-0000-4000-8000-000000000002", displayName: "Lucas Ferreira", email: "lucas.ferreira@guf.app", role: "support", hasVerifiedFactor: true, status: "active", lastSeenAt: day(0, 10), isMe: false },
    { userId: "00000000-0000-4000-8000-000000000003", displayName: "Paula Mendes", email: "paula.mendes@guf.app", role: "support", hasVerifiedFactor: true, status: "active", lastSeenAt: day(0, 9), isMe: false },
    { userId: "00000000-0000-4000-8000-000000000004", displayName: "Diego Santos", email: "diego.santos@guf.app", role: "viewer", hasVerifiedFactor: false, status: "active", lastSeenAt: day(-4), isMe: false },
    { userId: "00000000-0000-4000-8000-000000000005", displayName: "Renata Okada", email: "renata.okada@guf.app", role: "support", hasVerifiedFactor: false, status: "invited", lastSeenAt: null, isMe: false },
    { userId: "00000000-0000-4000-8000-000000000006", displayName: "Igor Castro", email: "igor.castro@guf.app", role: "viewer", hasVerifiedFactor: true, status: "disabled", lastSeenAt: day(-50), isMe: false },
  ];

  const audit: AuditEntry[] = [
    { id: 9, occurredAt: day(0, 10), actorId: staff[1]?.userId ?? null, actorName: "Lucas Ferreira", action: "staff_revealed_email", subjectId: people[0]?.userId ?? null, subjectLabel: "@marina.treina", details: {} },
    { id: 8, occurredAt: day(0, 9), actorId: staff[2]?.userId ?? null, actorName: "Paula Mendes", action: "staff_changed_plan", subjectId: people[2]?.userId ?? null, subjectLabel: "@thiago.mts", details: { reason: "courtesy", plan: "pro" } },
    { id: 7, occurredAt: day(-1, 18), actorId: MOCK_ME_ID, actorName: "Ana Ribeiro", action: "announcement_published", subjectId: null, subjectLabel: "—", details: { format: "modal", purpose: "product", reach: 18420 } },
    { id: 6, occurredAt: day(-1, 16), actorId: staff[1]?.userId ?? null, actorName: "Lucas Ferreira", action: "staff_changed_handle", subjectId: people[5]?.userId ?? null, subjectLabel: "@rafa.nunes", details: { reason: "titular_request", field: "handle" } },
    { id: 5, occurredAt: day(-2, 14), actorId: staff[2]?.userId ?? null, actorName: "Paula Mendes", action: "staff_unlinked_identity", subjectId: people[3]?.userId ?? null, subjectLabel: "@anamarques", details: { reason: "titular_request", provider: "google", note: "Pessoa confirmou o pedido por e-mail." } },
    { id: 4, occurredAt: day(-2, 11), actorId: MOCK_ME_ID, actorName: "Ana Ribeiro", action: "staff_member_role_changed", subjectId: staff[3]?.userId ?? null, subjectLabel: "Diego Santos", details: { role: "viewer" } },
    { id: 3, occurredAt: day(-3, 17), actorId: staff[1]?.userId ?? null, actorName: "Lucas Ferreira", action: "staff_changed_name", subjectId: people[1]?.userId ?? null, subjectLabel: "@marcos.v", details: { reason: "terms_violation", field: "name" } },
  ];

  return { people, announcements, staff, audit };
}

/** Banco fictício em memória (recarregar a página volta ao início). */
export function getMockDb(): MockDb {
  db ??= seed();
  return db;
}
