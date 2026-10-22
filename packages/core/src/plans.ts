import { toLocalISODate } from "./dates";
import { formatNumber } from "./format";
import { shiftMonth, startOfMonthOf } from "./history";

/**
 * Planos e direitos de acesso (puros, sem React). O banco decide o plano efetivo e os limites
 * (my_entitlements); aqui ficam as perguntas que as telas fazem ("pode usar X?", "qual o limite
 * de Y?") e os textos. Nenhuma tela testa o nome do plano: muda o catálogo, muda o app.
 * Arquitetura e como acrescentar planos ou funcionalidades: docs/plans-and-access.md.
 */

/** Funcionalidades do catálogo (tabela features). Nova funcionalidade = migration + valor aqui. */
export type PlanFeature =
  | "custom_projects"
  | "routines_per_project"
  | "guf_ai_daily_messages"
  | "chart_months"
  | "competition_full_history";

export const PLAN_FEATURES: readonly PlanFeature[] = [
  "custom_projects",
  "routines_per_project",
  "guf_ai_daily_messages",
  "chart_months",
  "competition_full_history",
];

export function isPlanFeature(value: string): value is PlanFeature {
  return (PLAN_FEATURES as readonly string[]).includes(value);
}

export type FeatureKind = "flag" | "limit";

/** O que um plano dá numa funcionalidade. `limit` nulo = sem limite (sempre nulo em "flag"). */
export interface FeatureAccess {
  kind: FeatureKind;
  enabled: boolean;
  limit: number | null;
}

/** Direitos do usuário logado (my_entitlements). */
export interface Entitlements {
  planCode: string;
  planName: string;
  /** Plano de quem não tem direito válido (Free). */
  isDefaultPlan: boolean;
  /** Fim do direito atual ("yyyy-MM-ddTHH:mm:ssZ"); null = sem prazo. */
  validUntil: string | null;
  features: Record<PlanFeature, FeatureAccess & { upgradable: boolean }>;
}

/** Plano do catálogo com o que ele dá em cada funcionalidade (tela de planos). */
export interface CatalogPlan {
  code: string;
  name: string;
  rank: number;
  isDefault: boolean;
  isPurchasable: boolean;
  features: Record<PlanFeature, FeatureAccess>;
}

/**
 * A funcionalidade está liberada? Sem direitos carregados (offline na primeira abertura) libera:
 * o banco continua barrando as gravações, e o app não deve travar quem está sem internet.
 */
export function canUseFeature(entitlements: Entitlements | null, feature: PlanFeature): boolean {
  return entitlements === null || entitlements.features[feature].enabled;
}

/** Limite da funcionalidade; null = sem limite (ou direitos ainda não carregados). */
export function featureLimit(entitlements: Entitlements | null, feature: PlanFeature): number | null {
  return entitlements === null ? null : entitlements.features[feature].limit;
}

/** Ainda cabe mais um? `used` = quantos a pessoa já tem (ou usou). */
export function hasRoomFor(entitlements: Entitlements | null, feature: PlanFeature, used: number): boolean {
  const limit = featureLimit(entitlements, feature);
  return limit === null || used < limit;
}

/** Projetos que contam no limite custom_projects (mesma regra do gatilho enforce_project_plan_limit). */
export function countCustomProjects(projects: ReadonlyArray<{ isFavorites: boolean; archivedAt: string | null }>): number {
  return projects.filter((project) => !project.isFavorites && project.archivedAt === null).length;
}

/**
 * Primeiro dia que os GRÁFICOS mostram (1º dia do mês mais antigo liberado); null = sem limite.
 * chart_months conta o mês atual: 2 = o mês atual e o anterior. O histórico de treinos, os
 * recordes e a evolução usam sempre o histórico inteiro; só o que o gráfico desenha é limitado.
 */
export function chartWindowStart(entitlements: Entitlements | null, today: Date): Date | null {
  const months = featureLimit(entitlements, "chart_months");
  if (months === null) return null;
  return shiftMonth(startOfMonthOf(today), -(Math.max(months, 1) - 1));
}

/** Um gráfico que começa nesta data ("yyyy-MM-dd") cabe no plano? */
export function isDateInChartWindow(entitlements: Entitlements | null, isoDate: string, today: Date): boolean {
  const start = chartWindowStart(entitlements, today);
  return start === null || isoDate >= toLocalISODate(start);
}

export interface UpsellCopy {
  title: string;
  message: string;
}

/**
 * Texto da tela "Isso faz parte do Pro" para a funcionalidade que a pessoa tentou usar.
 * Mesmo padrão em todas: título curto com o benefício; a mensagem diz o que o plano atual inclui e,
 * depois, o que o Pro libera ("No plano X, …. Com o Pro, ….").
 */
export function planUpsellCopy(feature: PlanFeature, entitlements: Entitlements | null): UpsellCopy {
  const limit = featureLimit(entitlements, feature);
  const current = `No plano ${entitlements?.planName ?? "Free"},`;
  switch (feature) {
    case "custom_projects":
      return {
        title: "Organize seus treinos em projetos",
        message: `${current} seus treinos ficam no projeto Favoritos. Com o Pro, você cria um projeto para cada fase, como Hipertrofia e Força.`,
      };
    case "routines_per_project":
      return {
        title: "Mais rotinas em cada projeto",
        message: `${current} cada projeto tem até ${formatNumber(limit ?? 0, 0)} rotinas ativas. Com o Pro, você monta quantas rotinas quiser.`,
      };
    case "guf_ai_daily_messages":
      return {
        title: "Mais conversas com o GUF AI",
        message: `${current} são ${formatNumber(limit ?? 0, 0)} perguntas por dia. Com o Pro, você pergunta muito mais e tira dúvidas sobre seus treinos sempre que precisar.`,
      };
    case "chart_months":
      return {
        title: "Toda a sua evolução nos gráficos",
        message: `${current} os gráficos mostram ${chartWindowText(limit)}. Com o Pro, eles mostram sua evolução desde o primeiro treino.`,
      };
    case "competition_full_history":
      return {
        title: "A competição completa",
        message: `${current} você acompanha o mês atual. Com o Pro, você vê as temporadas anteriores e os períodos de 3 meses, 6 meses, 1 ano e personalizado.`,
      };
  }
}

/** Aviso no GUF AI quando as perguntas do dia acabaram: "Você usou as 3 perguntas de hoje do plano Free." */
export function aiDailyLimitReachedText(entitlements: Entitlements | null): string {
  const limit = featureLimit(entitlements, "guf_ai_daily_messages");
  const plan = entitlements?.planName ?? "Free";
  return limit === null || limit === 0
    ? `Você usou as perguntas de hoje do plano ${plan}.`
    : `Você usou as ${formatNumber(limit, 0)} perguntas de hoje do plano ${plan}.`;
}

/** "o mês atual e o anterior" · "o mês atual" · "os últimos 3 meses" */
function chartWindowText(months: number | null): string {
  if (months === null) return "todo o período";
  if (months <= 1) return "o mês atual";
  if (months === 2) return "o mês atual e o anterior";
  return `os últimos ${formatNumber(months, 0)} meses`;
}

/** Nome da funcionalidade na comparação de planos. */
export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  custom_projects: "Projetos além do Favoritos",
  routines_per_project: "Rotinas por projeto",
  guf_ai_daily_messages: "Perguntas ao GUF AI por dia",
  chart_months: "Período dos gráficos",
  competition_full_history: "Competição além do mês atual",
};

/** Valor da funcionalidade num plano, para a comparação: "Até 5", "Sem limite", "Incluído", "—". */
export function formatFeatureAccess(feature: PlanFeature, access: FeatureAccess): string {
  if (!access.enabled) return "Não incluído";
  if (access.kind === "flag") return "Incluído";
  if (feature === "chart_months") return capitalize(chartWindowText(access.limit));
  if (access.limit === null) return "Sem limite";
  return `Até ${formatNumber(access.limit, 0)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
