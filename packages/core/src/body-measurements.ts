import { differenceInCalendarDays, subMonths } from "date-fns";
import { formatShortDate, fromLocalISODate, toLocalISODate } from "./dates";
import { formatNumber, MINUS_SIGN, plural } from "./format";

/**
 * Medidas corporais (circunferências em cm). Dado referente à saúde (LGPD art. 5º, II): só a
 * própria pessoa vê, gravação exige o consentimento de saúde vigente. Regras puras das telas
 * Perfil › Medidas corporais (lista, evolução por músculo e nova medição).
 */

/** Locais aceitos pelo banco (measurement_values.site). Lado: _e = esquerdo, _d = direito. */
export type MeasurementSite =
  | "pescoco"
  | "ombros"
  | "peitoral"
  | "cintura"
  | "abdomen"
  | "quadril"
  | "braco_d"
  | "braco_e"
  | "antebraco_d"
  | "antebraco_e"
  | "coxa_d"
  | "coxa_e"
  | "panturrilha_d"
  | "panturrilha_e";

export const MEASUREMENT_SITES: readonly MeasurementSite[] = [
  "pescoco",
  "ombros",
  "peitoral",
  "cintura",
  "abdomen",
  "quadril",
  "braco_d",
  "braco_e",
  "antebraco_d",
  "antebraco_e",
  "coxa_d",
  "coxa_e",
  "panturrilha_d",
  "panturrilha_e",
];

export type MeasurementSide = "left" | "right";

/** Músculo medido (mesmos nomes do ícone de músculo do design system). */
export type MeasurementPartKey = "biceps" | "antebraco" | "quadriceps" | "panturrilha" | "peito" | "ombro" | "abdomen" | "gluteos";

export type MeasurementPartSites = { kind: "bilateral"; left: MeasurementSite; right: MeasurementSite } | { kind: "single"; site: MeasurementSite };

export interface MeasurementPart {
  key: MeasurementPartKey;
  name: string;
  /** "Como medir", curto. */
  tip: string;
  sites: MeasurementPartSites;
}

/** Ordem do protótipo: braços e pernas (dois lados) e tronco (medida única). */
export const MEASUREMENT_PARTS: readonly MeasurementPart[] = [
  { key: "biceps", name: "Bíceps", tip: "Braço contraído, no ponto mais alto do músculo.", sites: { kind: "bilateral", left: "braco_e", right: "braco_d" } },
  { key: "antebraco", name: "Antebraço", tip: "Parte mais larga, com o braço estendido.", sites: { kind: "bilateral", left: "antebraco_e", right: "antebraco_d" } },
  { key: "quadriceps", name: "Quadríceps", tip: "Coxa relaxada, no meio entre o quadril e o joelho.", sites: { kind: "bilateral", left: "coxa_e", right: "coxa_d" } },
  { key: "panturrilha", name: "Panturrilha", tip: "Em pé, na parte mais larga da perna.", sites: { kind: "bilateral", left: "panturrilha_e", right: "panturrilha_d" } },
  { key: "peito", name: "Peitoral", tip: "Fita na linha dos mamilos, depois de expirar.", sites: { kind: "single", site: "peitoral" } },
  { key: "ombro", name: "Ombros", tip: "Volta completa na parte mais larga dos ombros.", sites: { kind: "single", site: "ombros" } },
  { key: "abdomen", name: "Abdômen", tip: "Cintura na linha do umbigo, abdômen relaxado.", sites: { kind: "single", site: "abdomen" } },
  { key: "gluteos", name: "Glúteos", tip: "Quadril na parte mais saliente dos glúteos.", sites: { kind: "single", site: "quadril" } },
];

/** Limites do banco (value_cm > 0 e < 300). */
export const MEASUREMENT_MAX_CM = 300;

/** Janela da variação mostrada na lista ("em 3 meses"). */
export const MEASUREMENT_DELTA_MONTHS = 3;

/** Variação abaixo disso conta como estável (seta reta). */
const STABLE_DELTA_CM = 0.05;

/** Medidas de um dia (cm por local). */
export interface BodyMeasurementDay {
  /** Data local "2026-10-12". */
  measuredOn: string;
  values: Partial<Record<MeasurementSite, number>>;
}

export type MeasurementPeriod = "3M" | "6M" | "Tudo";

export const MEASUREMENT_PERIODS: readonly MeasurementPeriod[] = ["3M", "6M", "Tudo"];

const PERIOD_MONTHS: Record<Exclude<MeasurementPeriod, "Tudo">, number> = { "3M": 3, "6M": 6 };

export function isMeasurementSite(value: string): value is MeasurementSite {
  return (MEASUREMENT_SITES as readonly string[]).includes(value);
}

export function findMeasurementPart(key: string | null | undefined): MeasurementPart | null {
  return MEASUREMENT_PARTS.find((part) => part.key === key) ?? null;
}

/** Locais de um músculo: os dois lados ou o único. */
export function partSites(part: MeasurementPart): MeasurementSite[] {
  return part.sites.kind === "bilateral" ? [part.sites.left, part.sites.right] : [part.sites.site];
}

/** Local mostrado no gráfico e nos registros: o lado escolhido ou a medida única. */
export function partSiteFor(part: MeasurementPart, side: MeasurementSide): MeasurementSite {
  if (part.sites.kind === "single") return part.sites.site;
  return side === "left" ? part.sites.left : part.sites.right;
}

/** "38,1" — sempre uma casa, como a fita métrica. */
export function formatCentimeters(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** "+0,6" · "−1,2" · "0,0" (sem cor de bom ou ruim: crescer ou diminuir depende do objetivo). */
export function formatCentimetersDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return formatCentimeters(0);
  return `${rounded > 0 ? "+" : MINUS_SIGN}${formatCentimeters(Math.abs(rounded))}`;
}

/** Texto do campo → cm com uma casa; vazio, inválido ou fora dos limites → null. Aceita vírgula. */
export function parseCentimeters(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 10) / 10;
  return value > 0 && value < MEASUREMENT_MAX_CM ? value : null;
}

/** Valores de um local, do mais antigo ao mais recente (só os dias que têm o local). */
export function siteHistory(days: readonly BodyMeasurementDay[], site: MeasurementSite): Array<{ measuredOn: string; value: number }> {
  return days.flatMap((day) => {
    const value = day.values[site];
    return value === undefined ? [] : [{ measuredOn: day.measuredOn, value }];
  });
}

function latestValue(days: readonly BodyMeasurementDay[], site: MeasurementSite): number | null {
  return siteHistory(days, site).at(-1)?.value ?? null;
}

export function hasPartRecords(days: readonly BodyMeasurementDay[], part: MeasurementPart): boolean {
  return partSites(part).some((site) => siteHistory(days, site).length > 0);
}

/** Linha de valor na lista: "E 37,9 · D 38,5", "86,0 cm" ou "Sem registro". */
export function partValueLine(days: readonly BodyMeasurementDay[], part: MeasurementPart): string {
  if (!hasPartRecords(days, part)) return "Sem registro";
  if (part.sites.kind === "single") return `${formatCentimeters(latestValue(days, part.sites.site) ?? 0)} cm`;
  const left = latestValue(days, part.sites.left);
  const right = latestValue(days, part.sites.right);
  return `E ${left === null ? "–" : formatCentimeters(left)} · D ${right === null ? "–" : formatCentimeters(right)}`;
}

/** Valor que representa o músculo num dia: a média dos lados medidos (ou a medida única). */
function partDayValue(day: BodyMeasurementDay, part: MeasurementPart): number | null {
  const values = partSites(part).flatMap((site) => (day.values[site] === undefined ? [] : [day.values[site]]));
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/**
 * Variação do músculo nos últimos 3 meses: último registro menos o primeiro da janela (ou o mais
 * antigo, se todos forem anteriores). null com menos de 2 registros.
 */
export function partDelta(days: readonly BodyMeasurementDay[], part: MeasurementPart, today: Date): number | null {
  const points = days.flatMap((day) => {
    const value = partDayValue(day, part);
    return value === null ? [] : [{ measuredOn: day.measuredOn, value }];
  });
  if (points.length < 2) return null;
  const cutoff = toLocalISODate(subMonths(today, MEASUREMENT_DELTA_MONTHS));
  const reference = points.find((p) => p.measuredOn >= cutoff) ?? points[0];
  const last = points.at(-1);
  return reference && last ? last.value - reference.value : null;
}

export type MeasurementTrend = "up" | "down" | "stable";

export function measurementTrend(delta: number): MeasurementTrend {
  if (delta > STABLE_DELTA_CM) return "up";
  if (delta < -STABLE_DELTA_CM) return "down";
  return "stable";
}

/** "hoje" · "ontem" · "há 10 dias". */
export function daysAgoLabel(iso: string, today: Date): string {
  const days = differenceInCalendarDays(today, fromLocalISODate(iso));
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

/** Data do registro mais recente (qualquer local) ou null. */
export function lastMeasuredOn(days: readonly BodyMeasurementDay[]): string | null {
  return days.at(-1)?.measuredOn ?? null;
}

/** "Seg, 12 out · há 10 dias" (Última medição, na lista). */
export function lastMeasurementLabel(days: readonly BodyMeasurementDay[], today: Date): string | null {
  const last = lastMeasuredOn(days);
  return last ? `${formatShortDate(fromLocalISODate(last))} · ${daysAgoLabel(last, today)}` : null;
}

/** "12 out" (sem o dia da semana). */
export function formatMeasurementDay(iso: string): string {
  return formatShortDate(fromLocalISODate(iso)).split(", ")[1] ?? iso;
}

/** Subtítulo do botão no perfil: "Última em 12 out · 8 músculos" ou o convite quando não há registro. */
export function measurementsEntrySubtitle(days: readonly BodyMeasurementDay[]): string {
  const last = lastMeasuredOn(days);
  if (!last) return "Registre suas circunferências";
  const parts = MEASUREMENT_PARTS.filter((part) => hasPartRecords(days, part)).length;
  return `Última em ${formatMeasurementDay(last)} · ${plural(parts, "músculo", "músculos")}`;
}

/** Primeiro dia que entra no gráfico do período (null = tudo). */
export function measurementPeriodStart(period: MeasurementPeriod, today: Date): string | null {
  return period === "Tudo" ? null : toLocalISODate(subMonths(today, PERIOD_MONTHS[period]));
}

export interface MeasurementChartData {
  values: number[];
  /** Data de cada ponto ("12 out"), para o balão da agulha. */
  pointLabels: string[];
  /** "4 mai" (primeiro ponto do período). */
  startLabel: string;
  /** "hoje" ou "12 out" (último ponto). */
  endLabel: string;
  latest: number;
  /** Último menos o primeiro ponto do período. */
  delta: number;
}

/** Pontos do gráfico de um local no período; null sem nenhum registro nele. */
export function measurementChart(days: readonly BodyMeasurementDay[], site: MeasurementSite, period: MeasurementPeriod, today: Date): MeasurementChartData | null {
  const start = measurementPeriodStart(period, today);
  const points = siteHistory(days, site).filter((p) => start === null || p.measuredOn >= start);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;
  return {
    values: points.map((p) => p.value),
    pointLabels: points.map((p) => formatMeasurementDay(p.measuredOn)),
    startLabel: formatMeasurementDay(first.measuredOn),
    endLabel: last.measuredOn === toLocalISODate(today) ? "hoje" : formatMeasurementDay(last.measuredOn),
    latest: last.value,
    delta: last.value - first.value,
  };
}

/** "Direito 0,6 cm maior" · "Iguais" (último registro com os dois lados). */
export function sideDifferenceLabel(left: number, right: number): string {
  const diff = Math.round((right - left) * 10) / 10;
  if (Math.abs(diff) < STABLE_DELTA_CM) return "Iguais";
  return `${diff > 0 ? "Direito" : "Esquerdo"} ${formatCentimeters(Math.abs(diff))} cm maior`;
}

/** Último dia que tem os dois lados do músculo (para comparar). */
export function latestBothSides(days: readonly BodyMeasurementDay[], part: MeasurementPart): { left: number; right: number } | null {
  if (part.sites.kind !== "bilateral") return null;
  const { left, right } = part.sites;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    const l = day?.values[left];
    const r = day?.values[right];
    if (l !== undefined && r !== undefined) return { left: l, right: r };
  }
  return null;
}

export interface MeasurementRecordRow {
  measuredOn: string;
  dateLabel: string;
  value: string;
  /** Outro lado, em cinza ("Direito 38,5"); vazio na medida única ou sem o outro lado. */
  other: string;
  /** Diferença para o registro anterior do mesmo local; vazio no primeiro. */
  delta: string;
}

/** Registros do local escolhido, do mais recente ao mais antigo. */
export function measurementRecordRows(days: readonly BodyMeasurementDay[], part: MeasurementPart, side: MeasurementSide): MeasurementRecordRow[] {
  const site = partSiteFor(part, side);
  const otherSite = part.sites.kind === "bilateral" ? (side === "left" ? part.sites.right : part.sites.left) : null;
  const otherName = side === "left" ? "Direito" : "Esquerdo";
  const history = siteHistory(days, site);
  return history
    .map((entry, index) => {
      const previous = history[index - 1];
      const otherValue = otherSite ? days.find((day) => day.measuredOn === entry.measuredOn)?.values[otherSite] : undefined;
      return {
        measuredOn: entry.measuredOn,
        dateLabel: formatShortDate(fromLocalISODate(entry.measuredOn)),
        value: formatCentimeters(entry.value),
        other: otherValue === undefined ? "" : `${otherName} ${formatCentimeters(otherValue)}`,
        delta: previous ? formatCentimetersDelta(entry.value - previous.value) : "",
      };
    })
    .reverse();
}

/** Valores do músculo num dia (o que "Desfazer" devolve depois de apagar o registro). */
export function partDayValues(day: BodyMeasurementDay | undefined, part: MeasurementPart): Partial<Record<MeasurementSite, number>> {
  const values: Partial<Record<MeasurementSite, number>> = {};
  for (const site of partSites(part)) {
    const value = day?.values[site];
    if (value !== undefined) values[site] = value;
  }
  return values;
}

/** Apagar o registro do músculo num dia: os dois lados (a linha mostra os dois) ou a medida única. */
export function removePartValues(part: MeasurementPart): Partial<Record<MeasurementSite, null>> {
  return Object.fromEntries(partSites(part).map((site) => [site, null]));
}

/** Os dias sem os locais apagados (atualização otimista da tela; dia vazio sai). */
export function withoutPartValues(days: readonly BodyMeasurementDay[], measuredOn: string, part: MeasurementPart): BodyMeasurementDay[] {
  const sites = partSites(part);
  return days.flatMap((day) => {
    if (day.measuredOn !== measuredOn) return [day];
    const values = Object.fromEntries(Object.entries(day.values).filter(([site]) => !sites.includes(site as MeasurementSite)));
    return Object.keys(values).length ? [{ ...day, values }] : [];
  });
}

/** Campos digitados na nova medição (texto como a pessoa digitou). */
export type MeasurementDraft = Partial<Record<MeasurementSite, string>>;

/** Registro do músculo num dia para editar; null se o dia não tem esse músculo (vira nova medição). */
export function measurementRecordFor(
  days: readonly BodyMeasurementDay[],
  part: MeasurementPart | null,
  measuredOn: string | null,
): { measuredOn: string; original: Partial<Record<MeasurementSite, number>> } | null {
  if (!part || !measuredOn) return null;
  const original = partDayValues(
    days.find((day) => day.measuredOn === measuredOn),
    part,
  );
  return Object.keys(original).length ? { measuredOn, original } : null;
}

/** Valores gravados → campos preenchidos (editar um registro). */
export function toMeasurementDraft(values: Partial<Record<MeasurementSite, number>>): MeasurementDraft {
  return Object.fromEntries(Object.entries(values).map(([site, value]) => [site, formatCentimeters(value)]));
}

/**
 * O que gravar ao editar um registro: os campos válidos e, para o que o registro tinha e a pessoa
 * apagou, null (some do dia).
 */
export function editedMeasurementValues(
  draft: MeasurementDraft,
  original: Partial<Record<MeasurementSite, number>>,
): Partial<Record<MeasurementSite, number | null>> {
  const values: Partial<Record<MeasurementSite, number | null>> = draftValues(draft);
  for (const site of Object.keys(original) as MeasurementSite[]) {
    if (values[site] === undefined) values[site] = null;
  }
  return values;
}

/** A edição mudou algo em relação ao registro (salvar fica liberado). */
export function hasMeasurementChanges(draft: MeasurementDraft, original: Partial<Record<MeasurementSite, number>>): boolean {
  // null só aparece para o que o registro tinha: é sempre uma mudança.
  return Object.entries(editedMeasurementValues(draft, original)).some(([site, value]) => value !== original[site as MeasurementSite]);
}

/** Valor mais recente de cada local (referência nos campos da nova medição). */
export function latestMeasurementValues(days: readonly BodyMeasurementDay[]): BodyMeasurementDay["values"] {
  return Object.assign({}, ...days.map((day) => day.values));
}

/** Algo digitado (válido ou não): sair pede confirmação. */
export function hasDraftInput(draft: MeasurementDraft): boolean {
  return Object.values(draft).some((text) => Boolean(text?.trim()));
}

/** Algum campo com texto que não é uma medida válida (salvar fica bloqueado). */
export function hasInvalidDraftField(draft: MeasurementDraft): boolean {
  return Object.values(draft).some((text) => isInvalidDraftField(text));
}

/** "Hoje, qui, 22 out" · "Qua, 15 out" (data da nova medição). */
export function measurementDateLabel(measuredOn: string, today: Date): string {
  const label = formatShortDate(fromLocalISODate(measuredOn));
  return measuredOn === toLocalISODate(today) ? `Hoje, ${label.toLowerCase()}` : label;
}

/** Só os campos válidos, em cm. */
export function draftValues(draft: MeasurementDraft): Partial<Record<MeasurementSite, number>> {
  const values: Partial<Record<MeasurementSite, number>> = {};
  for (const site of MEASUREMENT_SITES) {
    const value = parseCentimeters(draft[site] ?? "");
    if (value !== null) values[site] = value;
  }
  return values;
}

/** Campo preenchido com algo que não é uma medida válida (mostra o erro no campo). */
export function isInvalidDraftField(text: string | undefined): boolean {
  return Boolean(text?.trim()) && parseCentimeters(text ?? "") === null;
}

/** "Salvar 3 medidas" · "Salvar medição" (nada preenchido). */
export function saveMeasurementsLabel(count: number): string {
  return count === 0 ? "Salvar medição" : `Salvar ${plural(count, "medida", "medidas")}`;
}

/** "3 medidas salvas · hoje" · "1 medida salva · seg, 12 out". */
export function savedMeasurementsLabel(count: number, measuredOn: string, today: Date): string {
  const when = measuredOn === toLocalISODate(today) ? "hoje" : formatShortDate(fromLocalISODate(measuredOn)).toLowerCase();
  return `${count === 1 ? "1 medida salva" : `${formatNumber(count, 0)} medidas salvas`} · ${when}`;
}

/**
 * O que gravar para desfazer um registro: cada local salvo volta ao valor que o dia tinha antes,
 * ou é apagado (null) se o dia não tinha aquele local.
 */
export function undoMeasurementValues(
  previousDay: BodyMeasurementDay | undefined,
  savedSites: readonly MeasurementSite[],
): Partial<Record<MeasurementSite, number | null>> {
  return Object.fromEntries(savedSites.map((site) => [site, previousDay?.values[site] ?? null]));
}
