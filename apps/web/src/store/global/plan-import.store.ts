import type { PlanImportDraft } from "@guf/api";

/*
 * Ficha convertida no chat do GUF AI, entregue à tela de revisão (Projetos › Importar ficha).
 * Só em memória, de propósito: o rascunho não fica no aparelho e recarregar a página o descarta
 * (a tela volta para "colar a ficha").
 */
let pending: PlanImportDraft | null = null;

export function handOffPlanImport(draft: PlanImportDraft): void {
  pending = draft;
}

/** Leitura sem efeito (pode rodar duas vezes no modo estrito do React); limpar com `clearPendingPlanImport`. */
export function peekPendingPlanImport(): PlanImportDraft | null {
  return pending;
}

export function clearPendingPlanImport(): void {
  pending = null;
}
