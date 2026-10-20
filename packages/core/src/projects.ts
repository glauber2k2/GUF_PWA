import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { plural } from "./format";
import { estimateRoutineMinutes, routineDurationLabel } from "./workout";

/** Regras da aba Projetos (puras, sem React). */

/* ---------------------------------------------------------------------
 * Rotinas: nome curto, letra e resumo
 * --------------------------------------------------------------------- */

/** "Treino B – Costas e Bíceps" → "Treino B" */
export function routineShortName(name: string): string {
  return name.split(" – ")[0] ?? name;
}

/** Letra da rotina: "Treino B – …" → "B"; outros nomes → inicial. */
export function routineLetter(name: string): string {
  const match = /^Treino\s+(\S)/i.exec(name);
  return (match?.[1] ?? name.trim().charAt(0)).toUpperCase();
}

/**
 * "6 exercícios · ~52 min" (tempo médio dos últimos treinos) ou só "6 exercícios" se nunca foi
 * treinada; sem exercícios → "Nenhum exercício ainda".
 */
export function routineMeta(
  exercises: ReadonlyArray<{ targetSets: number | null; restSeconds: number | null }>,
  averageSeconds: number | null = null,
): string {
  if (exercises.length === 0) return "Nenhum exercício ainda";
  return [plural(exercises.length, "exercício", "exercícios"), routineDurationLabel(averageSeconds)]
    .filter(Boolean)
    .join(" · ");
}

/* ---------------------------------------------------------------------
 * Projetos: agrupamento e textos
 * --------------------------------------------------------------------- */

export interface ProjectLike {
  id: string;
  isActive: boolean;
  /** Projeto padrão "Favoritos" (fixo; aparece primeiro entre os demais). */
  isFavorites?: boolean;
  archivedAt: string | null;
  createdAt: string;
}

/**
 * Lista de projetos da tela: o ativo (no máximo um), os demais em uso (Favoritos primeiro, depois os mais recentes)
 * e os arquivados (arquivados mais recentemente primeiro).
 */
export function groupProjects<T extends ProjectLike>(projects: readonly T[]): { active: T | null; others: T[]; archived: T[] } {
  const live = projects.filter((p) => !p.archivedAt);
  const byNewest = (a: string, b: string) => b.localeCompare(a);
  return {
    active: live.find((p) => p.isActive) ?? null,
    others: live
      .filter((p) => !p.isActive)
      .sort((a, b) => Number(Boolean(b.isFavorites)) - Number(Boolean(a.isFavorites)) || byNewest(a.createdAt, b.createdAt)),
    archived: projects.filter((p) => p.archivedAt).sort((a, b) => byNewest(a.archivedAt ?? "", b.archivedAt ?? "")),
  };
}

/** "3 rotinas" */
export function projectMeta(routineCount: number): string {
  return plural(routineCount, "rotina", "rotinas");
}

/** "Arquivado em mar 2026" */
export function archivedLabel(archivedAt: string): string {
  return `Arquivado em ${format(new Date(archivedAt), "MMM yyyy", { locale: ptBR }).replace(".", "")}`;
}

/** Texto da confirmação de troca do projeto ativo. */
export function activateProjectMessage(currentName: string, targetName: string): string {
  return `O projeto '${currentName}' deixa de ser o ativo. A Início passa a sugerir as rotinas de '${targetName}'.`;
}

/** Texto da confirmação de arquivar (o histórico nunca é apagado). */
export function archiveProjectMessage(isActive: boolean): string {
  const base = "Seus treinos já feitos continuam no histórico. Você pode restaurar depois.";
  return isActive ? `${base} Você ficará sem projeto ativo até ativar outro.` : base;
}

/** Texto da confirmação de excluir projeto (as rotinas vão junto; o histórico fica). */
export function deleteProjectMessage(routineCount: number): string {
  const routines = routineCount === 0 ? "" : routineCount === 1 ? "A rotina deste projeto também será excluída. " : `As ${routineCount} rotinas deste projeto também serão excluídas. `;
  return `${routines}Os treinos já feitos continuam no histórico. Não dá para desfazer.`;
}

/** Aviso das telas de Projetos/Rotinas sem internet (edição só com conexão). */
export const OFFLINE_EDIT_MESSAGE = "para criar ou editar rotinas, conecte-se à internet.";

/* ---------------------------------------------------------------------
 * Ordem (position)
 * --------------------------------------------------------------------- */

/** Move o item de `from` para `to` (índices); devolve uma lista nova. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

/**
 * Positions sequenciais (1, 2, 3…) para a ordem nova, devolvendo só o que mudou
 * (menos gravações e sem "buracos" depois de reordenar ou arquivar).
 */
export function changedPositions(ordered: ReadonlyArray<{ id: string; position: number }>): Array<{ id: string; position: number }> {
  return ordered.flatMap((item, i) => (item.position === i + 1 ? [] : [{ id: item.id, position: i + 1 }]));
}

/** Próxima position ao criar no fim da lista (inclui arquivados, para não repetir). */
export function nextPosition(positions: readonly number[]): number {
  return positions.length ? Math.max(...positions) + 1 : 1;
}

/* ---------------------------------------------------------------------
 * Edição de rotina (exercícios planejados)
 * --------------------------------------------------------------------- */

/** Opções de descanso entre séries (segundos). */
export const ROUTINE_REST_OPTIONS = [45, 60, 90, 120, 180] as const;

/** Exercício recém-adicionado à rotina: 3 séries de 10, descanso padrão de 90 s. */
export const NEW_PLANNED_EXERCISE = { targetSets: 3, targetReps: "10", targetWeightKg: null, restSeconds: 90, notes: "" } as const;

/** "6 exercícios · 19 séries · ~55 min"; vazia → "Nenhum exercício". */
export function routineDraftSummary(exercises: ReadonlyArray<{ targetSets: number; restSeconds: number }>): string {
  if (exercises.length === 0) return "Nenhum exercício";
  const sets = exercises.reduce((total, e) => total + e.targetSets, 0);
  const minutes = estimateRoutineMinutes(exercises);
  return [plural(exercises.length, "exercício", "exercícios"), plural(sets, "série", "séries"), minutes ? `~${minutes} min` : null]
    .filter(Boolean)
    .join(" · ");
}
