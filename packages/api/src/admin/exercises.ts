import { catalogNameKey, EQUIPMENT_CODES, MUSCLE_GROUP_ORDER, type EquipmentCode, type MuscleGroupCode } from "@guf/core";
import type { CatalogExerciseInput } from "@guf/schemas";
import type { GufClient } from "../client";
import type { ApiResult } from "../result";
import { runQuery } from "./run-query";

/* =====================================================================
 * Contrato — Catálogo de exercícios do guf (exercises.user_id nulo).
 * Consultar: Leitura+. Cadastrar: Admin (o banco confere papel e segundo fator).
 * ===================================================================== */

export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroupCode;
  equipment: EquipmentCode;
  createdAt: string;
}

export interface CatalogExerciseFilters {
  query?: string;
  /** Vários grupos ao mesmo tempo; vazio = todos. */
  muscleGroups?: readonly MuscleGroupCode[];
  offset?: number;
}

export interface CatalogExercisePage {
  items: CatalogExercise[];
  /** Total com os filtros (para "Carregar mais"). */
  total: number;
}

/** Origem do cadastro, só para a auditoria. */
export type CatalogExerciseSource = "manual" | "file";

export interface CatalogCreateResult {
  created: string[];
  /** Nomes que já estavam no catálogo (ou repetidos no envio): ficaram de fora. */
  duplicates: string[];
}

/** Onde o exercício já foi usado (só números: a equipe nunca vê quem usa). */
export interface CatalogExerciseUsage {
  routines: number;
  workouts: number;
}

/** "deleted" = apagado (nunca usado) · "archived" = arquivado (usado: sai do catálogo, o histórico fica). */
export type CatalogDeleteResult = "deleted" | "archived";

export const CATALOG_PAGE_SIZE = 50;

type Result<T = null> = Promise<ApiResult<T>>;

export interface ExerciseCatalogAdminApi {
  listCatalogExercises: (client: GufClient, filters: CatalogExerciseFilters) => Result<CatalogExercisePage>;
  /** Chaves (`catalogNameKey`) dos nomes enviados que já estão no catálogo. */
  findExistingCatalogNames: (client: GufClient, input: { names: string[] }) => Result<string[]>;
  createCatalogExercises: (client: GufClient, input: { exercises: CatalogExerciseInput[]; source: CatalogExerciseSource }) => Result<CatalogCreateResult>;
  getCatalogExerciseUsage: (client: GufClient, input: { id: string }) => Result<CatalogExerciseUsage>;
  updateCatalogExercise: (client: GufClient, input: { id: string; exercise: CatalogExerciseInput }) => Result;
  deleteCatalogExercise: (client: GufClient, input: { id: string }) => Result<CatalogDeleteResult>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

function isMuscleGroup(value: string): value is MuscleGroupCode {
  return (MUSCLE_GROUP_ORDER as readonly string[]).includes(value);
}

function isEquipment(value: string): value is EquipmentCode {
  return (EQUIPMENT_CODES as readonly string[]).includes(value);
}

export const listCatalogExercises: ExerciseCatalogAdminApi["listCatalogExercises"] = async (client, filters) => {
  const result = await runQuery(() =>
    client.rpc("admin_list_exercises", {
      p_query: filters.query?.trim() || undefined,
      p_muscle_groups: filters.muscleGroups?.length ? [...filters.muscleGroups] : undefined,
      p_limit: CATALOG_PAGE_SIZE,
      p_offset: filters.offset ?? 0,
    }),
  );
  if (result.error) return result;
  const rows = result.data ?? [];
  return {
    data: {
      items: rows.flatMap((r) =>
        isMuscleGroup(r.muscle_group) && isEquipment(r.equipment)
          ? [{ id: r.id, name: r.name, muscleGroup: r.muscle_group, equipment: r.equipment, createdAt: r.created_at }]
          : [],
      ),
      total: Number(rows[0]?.total_count ?? 0),
    },
    error: null,
  };
};

export const findExistingCatalogNames: ExerciseCatalogAdminApi["findExistingCatalogNames"] = async (client, { names }) => {
  if (names.length === 0) return { data: [], error: null };
  const result = await runQuery(() => client.rpc("admin_existing_exercise_names", { p_names: names }));
  if (result.error) return result;
  return { data: (result.data ?? []).map(catalogNameKey), error: null };
};

export const createCatalogExercises: ExerciseCatalogAdminApi["createCatalogExercises"] = async (client, { exercises, source }) => {
  const payload = exercises.map((e) => ({ name: e.name, muscle_group: e.muscleGroup, equipment: e.equipment }));
  const result = await runQuery(() => client.rpc("admin_create_exercises", { p_exercises: payload, p_source: source }));
  if (result.error) return result;
  const rows = result.data ?? [];
  return {
    data: {
      created: rows.filter((r) => r.status === "created").map((r) => r.name),
      duplicates: rows.filter((r) => r.status === "duplicate").map((r) => r.name),
    },
    error: null,
  };
};

export const getCatalogExerciseUsage: ExerciseCatalogAdminApi["getCatalogExerciseUsage"] = async (client, { id }) => {
  const result = await runQuery(() => client.rpc("admin_exercise_usage", { p_id: id }));
  if (result.error) return result;
  const row = result.data?.[0];
  return { data: { routines: Number(row?.routines ?? 0), workouts: Number(row?.workouts ?? 0) }, error: null };
};

export const updateCatalogExercise: ExerciseCatalogAdminApi["updateCatalogExercise"] = async (client, { id, exercise }) => {
  const result = await runQuery(() =>
    client.rpc("admin_update_exercise", { p_id: id, p_name: exercise.name, p_muscle_group: exercise.muscleGroup, p_equipment: exercise.equipment }),
  );
  return result.error ? result : { data: null, error: null };
};

export const deleteCatalogExercise: ExerciseCatalogAdminApi["deleteCatalogExercise"] = async (client, { id }) => {
  const result = await runQuery(() => client.rpc("admin_delete_exercise", { p_id: id }));
  if (result.error) return result;
  return { data: result.data === "deleted" ? "deleted" : "archived", error: null };
};

export const exerciseCatalogAdminApi = {
  listCatalogExercises,
  findExistingCatalogNames,
  createCatalogExercises,
  getCatalogExerciseUsage,
  updateCatalogExercise,
  deleteCatalogExercise,
} satisfies ExerciseCatalogAdminApi;
