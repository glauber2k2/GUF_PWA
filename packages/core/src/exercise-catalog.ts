/**
 * Catálogo de exercícios do guf (painel): conversão de um arquivo (CSV, TSV, TXT ou JSON) em
 * exercícios para a equipe revisar antes de cadastrar. Tudo roda no navegador; só os exercícios
 * confirmados vão para o banco (`admin_create_exercises`, que confere tudo de novo).
 */
import { EQUIPMENT_CODES, MUSCLE_GROUP_ORDER, normalizeSearch, type MuscleGroupCode } from "./session";

export type EquipmentCode = (typeof EQUIPMENT_CODES)[number];

/** Limites iguais aos do banco (`exercises.name` e `admin_create_exercises`). */
export const CATALOG_EXERCISE_NAME_MAX = 100;
export const CATALOG_IMPORT_MAX_ROWS = 500;
/** Arquivo maior que isso não é uma lista de exercícios (evita travar o navegador). */
export const CATALOG_IMPORT_MAX_BYTES = 1_000_000;
export const CATALOG_IMPORT_ACCEPT = ".csv,.tsv,.txt,.json,text/csv,text/plain,application/json";

/** Linha lida do arquivo, antes de converter os códigos. */
export interface CatalogFileRow {
  /** Linha (ou posição na lista do JSON), a partir de 1, para a pessoa achar no arquivo. */
  line: number;
  name: string;
  muscle: string;
  equipment: string;
}

/** Exercício em revisão: o que veio do arquivo e o que foi reconhecido (editável na tela). */
export interface CatalogImportRow {
  id: string;
  line: number;
  name: string;
  muscleGroup: MuscleGroupCode | null;
  equipment: EquipmentCode | null;
  /** Texto original do arquivo, mostrado quando não foi reconhecido. */
  sourceMuscle: string;
  sourceEquipment: string;
}

export type CatalogImportIssue =
  | "missing_name"
  | "name_too_long"
  | "unknown_muscle"
  | "unknown_equipment"
  | "already_in_catalog"
  | "repeated_in_file";

export const CATALOG_IMPORT_ISSUE_TEXT: Record<CatalogImportIssue, string> = {
  missing_name: "Sem nome",
  name_too_long: `Nome com mais de ${CATALOG_EXERCISE_NAME_MAX} caracteres`,
  unknown_muscle: "Grupo muscular não reconhecido",
  unknown_equipment: "Equipamento não reconhecido",
  already_in_catalog: "Já está no catálogo",
  repeated_in_file: "Repetido no arquivo",
};

/** Duplicados não impedem o cadastro (ficam de fora); os outros precisam ser corrigidos ou removidos. */
export function isBlockingImportIssue(issue: CatalogImportIssue): boolean {
  return issue !== "already_in_catalog" && issue !== "repeated_in_file";
}

export type CatalogParseResult = { rows: CatalogFileRow[]; error: null } | { rows: null; error: string };

const MUSCLE_ALIASES: Record<string, MuscleGroupCode> = {
  peito: "peito", peitoral: "peito", peitorais: "peito", chest: "peito",
  costas: "costas", dorsal: "costas", dorsais: "costas", back: "costas", lombar: "costas", trapezio: "costas",
  ombro: "ombros", ombros: "ombros", deltoide: "ombros", deltoides: "ombros", shoulders: "ombros",
  biceps: "biceps",
  triceps: "triceps",
  antebraco: "antebraco", antebracos: "antebraco", forearm: "antebraco", forearms: "antebraco",
  quadriceps: "quadriceps", quadricep: "quadriceps", quads: "quadriceps", coxa: "quadriceps", "coxa anterior": "quadriceps",
  posterior: "posterior", "posterior de coxa": "posterior", posteriores: "posterior", isquiotibiais: "posterior", femoral: "posterior", hamstrings: "posterior",
  gluteo: "gluteos", gluteos: "gluteos", glutes: "gluteos",
  panturrilha: "panturrilha", panturrilhas: "panturrilha", gemeos: "panturrilha", calf: "panturrilha", calves: "panturrilha",
  abdomen: "abdomen", abdominal: "abdomen", abdominais: "abdomen", abs: "abdomen", core: "abdomen",
  "corpo inteiro": "corpo_inteiro", "corpo todo": "corpo_inteiro", "full body": "corpo_inteiro", funcional: "corpo_inteiro",
  cardio: "cardio", aerobico: "cardio", aerobio: "cardio",
};

const EQUIPMENT_ALIASES: Record<string, EquipmentCode> = {
  barra: "barra", "barra reta": "barra", "barra w": "barra", barbell: "barra",
  halter: "halter", halteres: "halter", haltere: "halter", dumbbell: "halter", dumbbells: "halter",
  maquina: "maquina", maquinas: "maquina", aparelho: "maquina", machine: "maquina",
  polia: "polia", cabo: "polia", cross: "polia", crossover: "polia", cable: "polia",
  "peso corporal": "peso_corporal", "peso do corpo": "peso_corporal", corporal: "peso_corporal", livre: "peso_corporal", bodyweight: "peso_corporal", calistenia: "peso_corporal",
  kettlebell: "kettlebell",
  smith: "smith", "maquina smith": "smith",
  elastico: "elastico", elasticos: "elastico", banda: "elastico", faixa: "elastico", band: "elastico",
  outro: "outro", outros: "outro",
};

const NAME_HEADERS = new Set(["nome", "exercicio", "exercicios", "name", "exercise"]);
const MUSCLE_HEADERS = new Set(["grupo", "grupo muscular", "musculo", "musculos", "muscle", "muscle group", "muscle_group", "grupo_muscular"]);
const EQUIPMENT_HEADERS = new Set(["equipamento", "equipamentos", "equipment", "aparelho"]);
const DELIMITERS = ["\t", ";", "|", ","] as const;
/** Texto livre sem colunas: "Supino reto - Peito - Barra". */
const TEXT_SEPARATOR = /\s+[-–—]\s+/;

/** Chave de comparação de nomes, igual a `exercise_name_key` do banco. */
export function catalogNameKey(name: string): string {
  return normalizeSearch(name).replace(/\s+/g, " ");
}

/** "Peitoral", "PEITO", "chest" → "peito"; não reconhecido → null. */
export function toMuscleGroupCode(raw: string): MuscleGroupCode | null {
  const key = catalogNameKey(raw).replace(/_/g, " ");
  if (!key) return null;
  const byCode = MUSCLE_GROUP_ORDER.find((code) => code.replace(/_/g, " ") === key);
  return byCode ?? MUSCLE_ALIASES[key] ?? null;
}

/** "Halteres", "dumbbell" → "halter"; vazio → "outro"; não reconhecido → null. */
export function toEquipmentCode(raw: string): EquipmentCode | null {
  const key = catalogNameKey(raw).replace(/_/g, " ");
  if (!key) return "outro";
  const byCode = EQUIPMENT_CODES.find((code) => code.replace(/_/g, " ") === key);
  return byCode ?? EQUIPMENT_ALIASES[key] ?? null;
}

/** Separa uma linha delimitada respeitando aspas ("Rosca, barra W";Bíceps). */
function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(firstLine: string): string | null {
  return DELIMITERS.find((d) => firstLine.includes(d)) ?? null;
}

function splitLine(line: string, delimiter: string | null): string[] {
  return delimiter ? splitDelimited(line, delimiter) : line.split(TEXT_SEPARATOR).map((c) => c.trim());
}

/** Posição das colunas pelo cabeçalho; sem cabeçalho reconhecido, a ordem nome · grupo · equipamento. */
function columnsFromHeader(cells: string[]): { name: number; muscle: number; equipment: number } | null {
  const keys = cells.map((c) => catalogNameKey(c));
  const name = keys.findIndex((k) => NAME_HEADERS.has(k));
  if (name < 0) return null;
  return { name, muscle: keys.findIndex((k) => MUSCLE_HEADERS.has(k)), equipment: keys.findIndex((k) => EQUIPMENT_HEADERS.has(k)) };
}

function parseTextTable(text: string): CatalogFileRow[] {
  const lines = text.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line })).filter((l) => l.text.trim() !== "");
  const first = lines[0];
  if (!first) return [];
  const delimiter = detectDelimiter(first.text);
  const header = columnsFromHeader(splitLine(first.text, delimiter));
  const columns = header ?? { name: 0, muscle: 1, equipment: 2 };
  return lines.slice(header ? 1 : 0).map(({ line, text: content }) => {
    const cells = splitLine(content, delimiter);
    const cell = (index: number) => (index >= 0 ? (cells[index] ?? "") : "");
    return { line, name: cell(columns.name), muscle: cell(columns.muscle), equipment: cell(columns.equipment) };
  });
}

function pickField(item: Record<string, unknown>, keys: Set<string>): string {
  const entry = Object.entries(item).find(([key]) => keys.has(catalogNameKey(key)));
  return typeof entry?.[1] === "string" ? entry[1].trim() : "";
}

/** A lista pode vir solta ou dentro de { "exercises": [...] } / { "exercicios": [...] }. */
function jsonExerciseList(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const { exercises, exercicios } = parsed as { exercises?: unknown; exercicios?: unknown };
  const list = exercises ?? exercicios;
  return Array.isArray(list) ? list : null;
}

function parseJsonList(text: string): CatalogFileRow[] | null {
  const list = jsonExerciseList(JSON.parse(text));
  if (!list) return null;
  return list.map((item: unknown, index) => {
    if (typeof item === "string") return { line: index + 1, name: item.trim(), muscle: "", equipment: "" };
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      line: index + 1,
      name: pickField(record, NAME_HEADERS),
      muscle: pickField(record, MUSCLE_HEADERS),
      equipment: pickField(record, EQUIPMENT_HEADERS),
    };
  });
}

/**
 * Lê o arquivo enviado: JSON (lista de nomes ou de objetos), CSV/TSV (com ou sem cabeçalho) ou texto
 * com uma linha por exercício ("Supino reto - Peito - Barra").
 * @returns as linhas lidas, ou o erro em português para mostrar na tela.
 */
export function parseCatalogFile(text: string, fileName: string): CatalogParseResult {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return { rows: null, error: "O arquivo está vazio." };
  const looksJson = fileName.toLowerCase().endsWith(".json") || /^[[{]/.test(trimmed);
  let rows: CatalogFileRow[] | null;
  try {
    rows = looksJson ? parseJsonList(trimmed) : parseTextTable(trimmed);
  } catch {
    return { rows: null, error: "Não foi possível ler o JSON. Confira se o arquivo é uma lista de exercícios válida." };
  }
  if (!rows) return { rows: null, error: "O JSON precisa ser uma lista de exercícios (ou ter a chave \"exercises\")." };
  const filled = rows.filter((r) => r.name || r.muscle || r.equipment);
  if (filled.length === 0) return { rows: null, error: "Nenhum exercício encontrado no arquivo." };
  if (filled.length > CATALOG_IMPORT_MAX_ROWS) {
    return { rows: null, error: `O arquivo tem ${filled.length} exercícios. Envie até ${CATALOG_IMPORT_MAX_ROWS} por vez.` };
  }
  return { rows: filled, error: null };
}

/** Converte as linhas lidas nos exercícios em revisão (grupo e equipamento reconhecidos pelos apelidos). */
export function buildCatalogImportRows(rows: CatalogFileRow[], makeId: () => string): CatalogImportRow[] {
  return rows.map((row) => ({
    id: makeId(),
    line: row.line,
    name: row.name.replace(/\s+/g, " ").trim(),
    muscleGroup: toMuscleGroupCode(row.muscle),
    equipment: toEquipmentCode(row.equipment),
    sourceMuscle: row.muscle,
    sourceEquipment: row.equipment,
  }));
}

/**
 * Problema de cada exercício em revisão (o primeiro que vale; `null` = pronto para cadastrar).
 * @param existingKeys chaves (`catalogNameKey`) dos nomes que já estão no catálogo.
 */
export function catalogImportIssues(rows: CatalogImportRow[], existingKeys: ReadonlySet<string>): Map<string, CatalogImportIssue | null> {
  const seen = new Set<string>();
  const issues = new Map<string, CatalogImportIssue | null>();
  for (const row of rows) {
    const key = catalogNameKey(row.name);
    issues.set(row.id, rowIssue(row, key, existingKeys, seen));
    if (key) seen.add(key);
  }
  return issues;
}

function rowIssue(row: CatalogImportRow, key: string, existingKeys: ReadonlySet<string>, seen: ReadonlySet<string>): CatalogImportIssue | null {
  if (!key) return "missing_name";
  if (row.name.length > CATALOG_EXERCISE_NAME_MAX) return "name_too_long";
  if (!row.muscleGroup) return "unknown_muscle";
  if (!row.equipment) return "unknown_equipment";
  if (existingKeys.has(key)) return "already_in_catalog";
  if (seen.has(key)) return "repeated_in_file";
  return null;
}
