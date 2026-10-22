/**
 * Comunicados no app (painel de administração → app). Catálogos de formato, tom, finalidade e
 * público: formato ou regra de público nova = entrada nova aqui (+ avaliador no banco), sem `switch`
 * espalhado pelas telas. Mesmas regras de supabase/migrations/20261022160000_admin_panel.sql.
 */

export type AnnouncementFormat = "fullscreen" | "modal" | "toast" | "banner";
export type AnnouncementTone = "info" | "success" | "warning" | "news";
export type AnnouncementPurpose = "service" | "legal" | "product";
export type AnnouncementFrequency = "once" | "until_dismissed";
export type AnnouncementPriority = "low" | "normal" | "high";
export type AnnouncementState = "draft" | "scheduled" | "active" | "ended";
export type AnnouncementEvent = "seen" | "dismissed" | "cta";

export const ANNOUNCEMENT_LIMITS = { title: 60, body: 160, ctaLabel: 24, targetIds: 10000 } as const;

export interface AnnouncementFormatDefinition {
  label: string;
  /** Interrompe a pessoa (só um por abertura do app). */
  isBlocking: boolean;
}

export const ANNOUNCEMENT_FORMATS: Record<AnnouncementFormat, AnnouncementFormatDefinition> = {
  fullscreen: { label: "Tela cheia", isBlocking: true },
  modal: { label: "Modal", isBlocking: true },
  toast: { label: "Toast", isBlocking: false },
  banner: { label: "Faixa", isBlocking: false },
};

export const ANNOUNCEMENT_TONES: Record<AnnouncementTone, { label: string }> = {
  info: { label: "Informação" },
  success: { label: "Sucesso" },
  warning: { label: "Atenção" },
  news: { label: "Novidade" },
};

export const ANNOUNCEMENT_PURPOSES: Record<AnnouncementPurpose, { label: string; description: string }> = {
  service: { label: "Serviço", description: "Manutenção, instabilidade, mudanças no funcionamento." },
  legal: { label: "Legal", description: "Termos, privacidade e consentimentos." },
  product: { label: "Produto", description: "Novidades e ofertas." },
};

export const ANNOUNCEMENT_PRIORITIES: Record<AnnouncementPriority, { label: string; value: number }> = {
  low: { label: "Baixa", value: 0 },
  normal: { label: "Normal", value: 50 },
  high: { label: "Alta", value: 100 },
};

export const ANNOUNCEMENT_FREQUENCIES: Record<AnnouncementFrequency, { label: string; description: string }> = {
  once: { label: "Mostrar uma vez", description: "Some depois da primeira vez que a pessoa vê." },
  until_dismissed: { label: "Até a pessoa fechar", description: "Volta a aparecer até tocar em “Agora não” ou no botão." },
};

export const ANNOUNCEMENT_STATES: Record<AnnouncementState, { label: string; tabLabel: string }> = {
  draft: { label: "Rascunho", tabLabel: "Rascunhos" },
  scheduled: { label: "Agendado", tabLabel: "Agendados" },
  active: { label: "Ativo", tabLabel: "Ativos" },
  ended: { label: "Encerrado", tabLabel: "Encerrados" },
};

/** Telas que o botão do comunicado pode abrir (caminhos internos do app). */
export const ANNOUNCEMENT_DESTINATIONS = [
  { label: "Início", path: "/" },
  { label: "Histórico", path: "/#historico" },
  { label: "Competição", path: "/competicao" },
  { label: "Projetos", path: "/projetos" },
  { label: "Perfil", path: "/perfil" },
  { label: "Medidas", path: "/medidas" },
  { label: "Planos", path: "/planos" },
  { label: "Configurações", path: "/configuracoes" },
  { label: "Documentos", path: "/documentos" },
] as const;

/** Rótulo da tela de destino ("/perfil" → "Perfil"). */
export function destinationLabel(path: string | null): string | null {
  if (!path) return null;
  return ANNOUNCEMENT_DESTINATIONS.find((d) => d.path === path)?.label ?? path;
}

export function priorityFromValue(value: number): AnnouncementPriority {
  if (value >= ANNOUNCEMENT_PRIORITIES.high.value) return "high";
  return value <= ANNOUNCEMENT_PRIORITIES.low.value ? "low" : "normal";
}

// ---------------------------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------------------------

export type AccountCreatedOp = "before" | "on" | "after";
export type ProfileVisibility = "private" | "open";

export type AudienceRule =
  | { type: "all" }
  | { type: "ids" }
  | { type: "plans"; plans: string[] }
  | { type: "created"; op: AccountCreatedOp; date: string }
  | { type: "visibility"; value: ProfileVisibility }
  | { type: "health_consent" };

export type AudienceRuleType = AudienceRule["type"];

export interface Audience {
  rules: AudienceRule[];
}

/** Dados que o resumo do público precisa (nomes dos planos, tamanho da lista de ids). */
export interface AudienceContext {
  planNames: Record<string, string>;
  targetCount: number;
}

export interface AudienceCriterion {
  label: string;
  /** Regra nova com valores iniciais (o editor ajusta depois). */
  create: (today: Date) => AudienceRule;
  /** Texto curto do chip e do resumo ("Plano: Free"). */
  describe: (rule: AudienceRule, context: AudienceContext) => string;
  /** Finalidades em que a regra pode ser usada; ausente = todas. */
  allowedPurposes?: readonly AnnouncementPurpose[];
}

export const CREATED_OPS: Record<AccountCreatedOp, string> = { before: "Antes", on: "No dia", after: "Depois" };
const CREATED_OP_TEXT: Record<AccountCreatedOp, string> = { before: "antes de", on: "em", after: "depois de" };

function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-10-01" → "1 out 2026" (sem depender do fuso). */
export function formatIsoDay(iso: string): string {
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

export const AUDIENCE_CRITERIA: Record<AudienceRuleType, AudienceCriterion> = {
  all: { label: "Todos", create: () => ({ type: "all" }), describe: () => "Todos" },
  ids: {
    label: "Lista de ids",
    create: () => ({ type: "ids" }),
    describe: (_rule, { targetCount }) => `Lista de ids · ${targetCount.toLocaleString("pt-BR")}`,
  },
  plans: {
    label: "Plano",
    create: () => ({ type: "plans", plans: ["free"] }),
    describe: (rule, { planNames }) =>
      rule.type === "plans" ? `Plano: ${rule.plans.map((p) => planNames[p] ?? p).join(" ou ")}` : "Plano",
  },
  created: {
    label: "Data de criação da conta",
    create: (today) => ({ type: "created", op: "after", date: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)) }),
    describe: (rule) =>
      rule.type === "created" ? `Conta criada ${CREATED_OP_TEXT[rule.op]} ${formatIsoDay(rule.date)}` : "Data de criação",
  },
  visibility: {
    label: "Perfil privado ou aberto",
    create: () => ({ type: "visibility", value: "open" }),
    describe: (rule) => (rule.type === "visibility" && rule.value === "private" ? "Perfil privado" : "Perfil aberto"),
  },
  health_consent: {
    label: "Com consentimento de saúde",
    create: () => ({ type: "health_consent" }),
    describe: () => "Com consentimento de saúde",
    // Consentimento dado para acompanhar a própria evolução (Art. 11, I): nunca para oferta.
    allowedPurposes: ["service", "legal"],
  },
};

export const AUDIENCE_RULE_TYPES = Object.keys(AUDIENCE_CRITERIA) as AudienceRuleType[];

export const AUDIENCE_ALL: Audience = { rules: [{ type: "all" }] };

export function hasAudienceRule(audience: Audience, type: AudienceRuleType): boolean {
  return audience.rules.some((rule) => rule.type === type);
}

/** Acrescenta uma regra: "Todos" substitui as outras; qualquer outra tira o "Todos". */
export function addAudienceRule(audience: Audience, rule: AudienceRule): Audience {
  if (rule.type === "all") return AUDIENCE_ALL;
  const rules = audience.rules.filter((r) => r.type !== "all" && r.type !== rule.type);
  return { rules: [...rules, rule] };
}

/** Troca a regra do mesmo tipo (mudança dos valores no editor). */
export function replaceAudienceRule(audience: Audience, rule: AudienceRule): Audience {
  return { rules: audience.rules.map((r) => (r.type === rule.type ? rule : r)) };
}

/** Remove a regra; sem nenhuma, volta para "Todos". */
export function removeAudienceRule(audience: Audience, type: AudienceRuleType): Audience {
  const rules = audience.rules.filter((r) => r.type !== type);
  return rules.length > 0 ? { rules } : AUDIENCE_ALL;
}

/** "Plano: Free E Conta criada depois de 1 out 2026". */
export function describeAudience(audience: Audience, context: AudienceContext): string {
  return audience.rules.map((rule) => AUDIENCE_CRITERIA[rule.type].describe(rule, context)).join(" E ");
}

/** A finalidade pode ser usada com este público? (consentimento de saúde nunca em produto) */
export function isPurposeAllowed(audience: Audience, purpose: AnnouncementPurpose): boolean {
  return audience.rules.every((rule) => {
    const allowed = AUDIENCE_CRITERIA[rule.type].allowedPurposes;
    return !allowed || allowed.includes(purpose);
  });
}

/** Primeira finalidade permitida para o público (ao acrescentar uma regra que restringe). */
export function fallbackPurpose(audience: Audience, purpose: AnnouncementPurpose): AnnouncementPurpose {
  if (isPurposeAllowed(audience, purpose)) return purpose;
  return (Object.keys(ANNOUNCEMENT_PURPOSES) as AnnouncementPurpose[]).find((p) => isPurposeAllowed(audience, p)) ?? "legal";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Ids colados ou do .csv (um por linha, vírgula ou espaço): válidos sem repetição + quantos não são ids. */
export function parseTargetIds(text: string): { ids: string[]; invalidCount: number } {
  const tokens = text.split(/[\s,;]+/).map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean);
  const ids = [...new Set(tokens.filter(isUuid).map((t) => t.toLowerCase()))];
  return { ids, invalidCount: tokens.filter((t) => !isUuid(t)).length };
}

// ---------------------------------------------------------------------------------------------
// Fila no app
// ---------------------------------------------------------------------------------------------

export interface AppAnnouncement {
  id: string;
  format: AnnouncementFormat;
  tone: AnnouncementTone;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaPath: string | null;
  priority: number;
  publishedAt: string | null;
}

/** Quantos avisos que não interrompem (toast e faixa) aparecem numa abertura. */
export const MAX_PASSIVE_ANNOUNCEMENTS = 2;

export interface AnnouncementQueue {
  /** No máximo 1 tela cheia ou modal por abertura. */
  blocking: AppAnnouncement | null;
  toasts: AppAnnouncement[];
  banner: AppAnnouncement | null;
}

/** Ordem: prioridade, depois o mais recente. Respeita o limite de avisos por abertura. */
export function nextAnnouncements(items: AppAnnouncement[]): AnnouncementQueue {
  const ordered = [...items].sort(
    (a, b) => b.priority - a.priority || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  const passive = ordered.filter((a) => !ANNOUNCEMENT_FORMATS[a.format].isBlocking).slice(0, MAX_PASSIVE_ANNOUNCEMENTS);
  return {
    blocking: ordered.find((a) => ANNOUNCEMENT_FORMATS[a.format].isBlocking) ?? null,
    toasts: passive.filter((a) => a.format === "toast"),
    banner: passive.find((a) => a.format === "banner") ?? null,
  };
}
