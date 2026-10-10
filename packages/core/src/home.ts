/** Regras da tela Início (puras, sem React). */

/** Primeiro nome do perfil ("Lucas Almeida" → "Lucas"); null se não houver nome. */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** Saudação pela hora local: 5h–11h "Bom dia", 12h–17h "Boa tarde", demais "Boa noite". */
export function greeting(date: Date, name?: string | null): string {
  const hour = date.getHours();
  const base = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const first = firstName(name);
  return first ? `${base}, ${first}` : base;
}

export interface RoutineOrder {
  id: string;
  position: number;
}

/**
 * Rotina sugerida para hoje: a próxima do projeto ativo depois da última concluída,
 * seguindo `position` e voltando para a primeira depois da última.
 * Sem histórico (ou última fora do projeto) → a primeira. Sem rotinas → null.
 */
export function suggestNextRoutine<T extends RoutineOrder>(routines: readonly T[], lastRoutineId: string | null): T | null {
  const ordered = [...routines].sort((a, b) => a.position - b.position);
  if (ordered.length === 0) return null;
  const lastIndex = lastRoutineId ? ordered.findIndex((r) => r.id === lastRoutineId) : -1;
  if (lastIndex === -1) return ordered[0] ?? null;
  return ordered[(lastIndex + 1) % ordered.length] ?? null;
}

export interface StreakInput {
  currentStreak: number;
  bestStreak: number;
  weekSecured: boolean;
  streakAtRisk: boolean;
}

/**
 * Situação da sequência (regra: 1 treino concluído na semana seg–dom mantém a sequência).
 * - secured: a semana atual já tem treino.
 * - zero: sem sequência ativa (zerada ou usuário novo) e semana ainda sem treino.
 * - risk: sequência ativa e semana ainda sem treino.
 */
export type StreakStatus = "secured" | "zero" | "risk";

export function streakStatus({ currentStreak, weekSecured }: Pick<StreakInput, "currentStreak" | "weekSecured">): StreakStatus {
  if (weekSecured) return "secured";
  return currentStreak > 0 ? "risk" : "zero";
}

/** Recorde: a sequência atual é a maior da história (e maior que zero). */
export function isStreakRecord({ currentStreak, bestStreak }: Pick<StreakInput, "currentStreak" | "bestStreak">): boolean {
  return currentStreak > 0 && currentStreak >= bestStreak;
}
