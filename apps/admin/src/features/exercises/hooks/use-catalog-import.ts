"use client";

import { useMemo, useState } from "react";
import {
  buildCatalogImportRows,
  CATALOG_IMPORT_MAX_BYTES,
  catalogImportIssues,
  isBlockingImportIssue,
  parseCatalogFile,
  type CatalogImportIssue,
  type CatalogImportRow,
} from "@guf/core";
import { catalogExerciseSchema, type CatalogExerciseInput } from "@guf/schemas";
import { useCreateCatalogExercises, useFindExistingCatalogNames } from "@/features/exercises/api/use-exercise-catalog";

export type CatalogImportRowPatch = Partial<Pick<CatalogImportRow, "name" | "muscleGroup" | "equipment">>;

export interface CatalogImportCounts {
  /** Prontos para cadastrar. */
  ready: number;
  /** Já no catálogo ou repetidos no arquivo: ficam de fora. */
  skipped: number;
  /** Precisam de correção (ou ser removidos) antes de cadastrar. */
  blocking: number;
}

const BYTES_PER_KB = 1024;

function countRows(issues: Map<string, CatalogImportIssue | null>): CatalogImportCounts {
  const counts: CatalogImportCounts = { ready: 0, skipped: 0, blocking: 0 };
  for (const issue of issues.values()) {
    if (!issue) counts.ready += 1;
    else if (isBlockingImportIssue(issue)) counts.blocking += 1;
    else counts.skipped += 1;
  }
  return counts;
}

function readyExercises(rows: CatalogImportRow[], issues: Map<string, CatalogImportIssue | null>): CatalogExerciseInput[] {
  return rows.flatMap((row) => {
    if (issues.get(row.id)) return [];
    const parsed = catalogExerciseSchema.safeParse({ name: row.name, muscleGroup: row.muscleGroup, equipment: row.equipment });
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Importar exercícios de um arquivo: lê e converte no navegador, confere os nomes que já estão no
 * catálogo e guarda a revisão (editar, remover). Nada vai para o banco até `submit`.
 */
export function useCatalogImport() {
  const findExisting = useFindExistingCatalogNames();
  const create = useCreateCatalogExercises();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [rows, setRows] = useState<CatalogImportRow[]>([]);
  const [existingKeys, setExistingKeys] = useState<ReadonlySet<string>>(new Set());

  const issues = useMemo(() => catalogImportIssues(rows, existingKeys), [rows, existingKeys]);
  const counts = useMemo(() => countRows(issues), [issues]);

  const checkExisting = (names: string[]) =>
    findExisting.mutate(names, { onSuccess: (keys) => setExistingKeys(new Set(keys)) });

  const readFile = async (file: File) => {
    setFileError(null);
    if (file.size > CATALOG_IMPORT_MAX_BYTES) {
      setFileError(`O arquivo tem mais de ${Math.round(CATALOG_IMPORT_MAX_BYTES / BYTES_PER_KB)} KB. Divida a lista em arquivos menores.`);
      return;
    }
    setIsReading(true);
    const parsed = parseCatalogFile(await file.text(), file.name);
    setIsReading(false);
    if (parsed.error !== null) {
      setFileError(parsed.error);
      return;
    }
    const nextRows = buildCatalogImportRows(parsed.rows, () => crypto.randomUUID());
    setFileName(file.name);
    setRows(nextRows);
    setExistingKeys(new Set());
    checkExisting(nextRows.map((row) => row.name).filter(Boolean));
  };

  const updateRow = (id: string, patch: CatalogImportRowPatch) => setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id: string) => setRows((current) => current.filter((row) => row.id !== id));
  const isSkipped = (row: CatalogImportRow) => {
    const issue = issues.get(row.id);
    return issue != null && !isBlockingImportIssue(issue);
  };
  const removeSkipped = () => setRows((current) => current.filter((row) => !isSkipped(row)));

  const reset = () => {
    setFileName(null);
    setFileError(null);
    setRows([]);
    setExistingKeys(new Set());
    create.reset();
    findExisting.reset();
  };

  const submit = (onCreated: (created: string[], duplicates: string[]) => void) => {
    const exercises = readyExercises(rows, issues);
    if (exercises.length === 0 || counts.blocking > 0) return;
    create.mutate({ exercises, source: "file" }, { onSuccess: ({ created, duplicates }) => onCreated(created, duplicates) });
  };

  return {
    fileName,
    fileError,
    isReading,
    rows,
    issues,
    counts,
    isCheckingExisting: findExisting.isPending,
    checkError: findExisting.error,
    retryCheck: () => checkExisting(rows.map((row) => row.name).filter(Boolean)),
    readFile,
    updateRow,
    removeRow,
    removeSkipped,
    reset,
    submit,
    isSubmitting: create.isPending,
    submitError: create.error,
  };
}
