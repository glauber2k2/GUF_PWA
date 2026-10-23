/**
 * Extrato de pontos da competição: de onde veio cada ponto, por semana e por treino. Os totais vêm
 * do servidor (competition_week_scores); aqui só a distribuição para mostrar, sempre somando o
 * total da semana: constância por dia que contou, recordes por treino até o limite da semana,
 * sequência e volume como linhas da semana. Puro (sem React).
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { seasonOf } from "./competition";
import { addLocalDays, fromLocalISODate, startOfLocalWeek, toLocalISODate } from "./dates";
import { formatNumber } from "./format";

/** Origem de um ponto. */
export type PointSource = "constancy" | "streak" | "records" | "volume";

export const POINT_SOURCES: readonly PointSource[] = ["constancy", "streak", "records", "volume"];

export const POINT_SOURCE_LABELS: Record<PointSource, string> = {
  constancy: "Constância",
  streak: "Sequência",
  records: "Recordes",
  volume: "Volume",
};

/** Semana como o servidor entrega (get_my_points_statement → weeks). */
export interface StatementWeek {
  weekStart: string;
  points: number;
  constancyPoints: number;
  bonusPoints: number;
  recordPoints: number;
  volumePoints: number;
  validSessions: number;
  weeklyVolumeKg: number;
  records: number;
  fulfilled: boolean;
}

/** Treino do período (get_my_points_statement → sessions). */
export interface StatementSession {
  sessionId: string;
  name: string;
  /** Dia do treino no fuso do perfil ("yyyy-MM-dd"). */
  day: string;
  weekStart: string;
  /** Minutos considerados (tempo efetivo, com o teto da regra). */
  minutes: number;
  isValid: boolean;
  /** O treino que vale no dia (no máximo um: o válido de maior volume). */
  counted: boolean;
  volumeKg: number;
  records: number;
}

export interface PointsStatement {
  /** Primeiro dia que o plano deixa ver (Free: início da temporada atual). */
  visibleFrom: string | null;
  weeks: StatementWeek[];
  sessions: StatementSession[];
}

/** Parâmetros da regra que a distribuição usa (competition_parameters). */
export interface StatementRule {
  constancyPointsPerDay: number;
  recordPoints: number;
  minMinutes: number;
}

/** Por que um treino rendeu (ou não) pontos de constância. */
export type SessionOutcome = "counted" | "short" | "same_day";

export interface StatementDay {
  sessionId: string;
  name: string;
  day: string;
  /** "17" */
  dayLabel: string;
  /** "Sáb" */
  weekdayLabel: string;
  minutes: number;
  outcome: SessionOutcome;
  volumeKg: number;
  recordCount: number;
  constancy: number;
  /** Pontos de recorde deste treino (o limite da semana corta os últimos). */
  recordPoints: number;
  total: number;
}

export interface StatementWeekView {
  weekStart: string;
  /** "12 – 18 out" */
  label: string;
  /** "Esta semana" · "Semana passada" · "" */
  relative: string;
  parts: Record<PointSource, number>;
  total: number;
  weeklyVolumeKg: number;
  fulfilled: boolean;
  /** Recordes batidos além do que o limite da semana pagou. */
  uncappedRecords: number;
  days: StatementDay[];
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_PER_WEEK = 7;

function shortDay(date: Date): string {
  return format(date, "d MMM", { locale: ptBR }).replace(".", "");
}

/** "12 – 18 out" · "28 set – 4 out" */
export function weekRangeLabel(weekStart: string): string {
  const start = fromLocalISODate(weekStart);
  const end = addLocalDays(start, DAYS_PER_WEEK - 1);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth ? `${start.getDate()} – ${shortDay(end)}` : `${shortDay(start)} – ${shortDay(end)}`;
}

function relativeWeekLabel(weekStart: string, today: Date): string {
  const current = toLocalISODate(startOfLocalWeek(today));
  if (weekStart === current) return "Esta semana";
  if (weekStart === toLocalISODate(addLocalDays(startOfLocalWeek(today), -DAYS_PER_WEEK))) return "Semana passada";
  return "";
}

function outcomeOf(session: StatementSession): SessionOutcome {
  if (session.counted) return "counted";
  return session.isValid ? "same_day" : "short";
}

/** Treinos de uma semana com os pontos de cada um (recordes pela ordem, até o total da semana). */
function weekDays(week: StatementWeek, sessions: readonly StatementSession[], rule: StatementRule): StatementDay[] {
  let recordBudget = week.recordPoints;
  return sessions
    .filter((s) => s.weekStart === week.weekStart)
    .map((s) => {
      const recordPoints = Math.min(recordBudget, s.records * rule.recordPoints);
      recordBudget -= recordPoints;
      const constancy = s.counted ? rule.constancyPointsPerDay : 0;
      const date = fromLocalISODate(s.day);
      return {
        sessionId: s.sessionId,
        name: s.name,
        day: s.day,
        dayLabel: String(date.getDate()),
        weekdayLabel: WEEKDAY_LABELS[date.getDay()] ?? "",
        minutes: s.minutes,
        outcome: outcomeOf(s),
        volumeKg: s.volumeKg,
        recordCount: s.records,
        constancy,
        recordPoints,
        total: constancy + recordPoints,
      };
    })
    .sort((a, b) => b.day.localeCompare(a.day));
}

/**
 * Semanas do extrato, da mais recente para a mais antiga.
 * @param weeks semanas do servidor (só as que pertencem ao período mostrado)
 */
export function buildStatementWeeks(weeks: readonly StatementWeek[], sessions: readonly StatementSession[], rule: StatementRule, today: Date): StatementWeekView[] {
  return [...weeks]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .map((w) => {
      const days = weekDays(w, sessions, rule);
      const paidRecords = rule.recordPoints > 0 ? w.recordPoints / rule.recordPoints : 0;
      return {
        weekStart: w.weekStart,
        label: weekRangeLabel(w.weekStart),
        relative: relativeWeekLabel(w.weekStart, today),
        parts: { constancy: w.constancyPoints, streak: w.bonusPoints, records: w.recordPoints, volume: w.volumePoints },
        total: w.points,
        weeklyVolumeKg: w.weeklyVolumeKg,
        fulfilled: w.fulfilled,
        uncappedRecords: Math.max(0, w.records - Math.round(paidRecords)),
        days,
      };
    })
    .filter((w) => w.total > 0 || w.days.length > 0);
}

/** Soma das partes e total arredondado (o mesmo arredondamento do servidor, por semana). */
export function statementTotals(weeks: readonly StatementWeekView[]): Record<PointSource, number> & { total: number } {
  const parts = { constancy: 0, streak: 0, records: 0, volume: 0 };
  for (const w of weeks) for (const source of POINT_SOURCES) parts[source] += w.parts[source];
  return { ...parts, total: weeks.reduce((sum, w) => sum + w.total, 0) };
}

/** A semana mostra algo da origem filtrada? (constância e recordes por treino; sequência e volume por semana) */
export function weekHasSource(week: StatementWeekView, source: PointSource): boolean {
  return week.parts[source] > 0;
}

/** Treinos que aparecem com o filtro (sem filtro, todos, inclusive os que não contaram). */
export function daysForSource(week: StatementWeekView, source: PointSource | null): StatementDay[] {
  if (source === "constancy") return week.days.filter((d) => d.constancy > 0);
  if (source === "records") return week.days.filter((d) => d.recordPoints > 0);
  if (source === "streak" || source === "volume") return [];
  return week.days;
}

/* ---------------------------------------------------------------------
 * Temporadas (mês) e ano
 * --------------------------------------------------------------------- */

/** Semanas cujo sábado cai no mês (a mesma regra da competição), até hoje. */
export function seasonRange(season: Date, today: Date): { from: string; to: string } {
  const lastDay = new Date(season.getFullYear(), season.getMonth() + 1, 0);
  const lastSaturday = addLocalDays(lastDay, -((lastDay.getDay() + 1) % DAYS_PER_WEEK));
  const end = lastSaturday < today ? lastSaturday : today;
  return { from: toLocalISODate(startOfLocalWeek(season)), to: toLocalISODate(end) };
}

/** Temporada (1º dia do mês) de uma semana. */
export function seasonOfWeek(weekStart: string): string {
  return toLocalISODate(seasonOf(fromLocalISODate(weekStart)));
}

/** Do início da temporada de janeiro do ano até hoje (visão "Ano"). */
export function yearRange(today: Date): { from: string; to: string } {
  return { from: toLocalISODate(startOfLocalWeek(new Date(today.getFullYear(), 0, 1))), to: toLocalISODate(today) };
}

export interface StatementMonth {
  /** "2026-10-01" */
  season: string;
  /** "Outubro" */
  name: string;
  /** "O" (barra do gráfico) */
  initial: string;
  total: number;
  sessions: number;
  records: number;
  isOpen: boolean;
  /** Antes do que o plano deixa ver ou ainda não começou. */
  isAvailable: boolean;
}

/** "Outubro" */
export function seasonMonthName(season: Date): string {
  return monthName(season);
}

function monthName(season: Date): string {
  const name = format(season, "MMMM", { locale: ptBR });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Os 12 meses do ano com o total de cada temporada (meses futuros ficam indisponíveis). */
export function statementYearMonths(statement: PointsStatement, today: Date): StatementMonth[] {
  const current = seasonOf(today);
  return Array.from({ length: 12 }, (_, month) => {
    const season = new Date(today.getFullYear(), month, 1);
    const key = toLocalISODate(season);
    const weeks = statement.weeks.filter((w) => seasonOfWeek(w.weekStart) === key);
    const isFuture = season > current;
    const lastDay = toLocalISODate(new Date(season.getFullYear(), month + 1, 0));
    const isVisible = !statement.visibleFrom || statement.visibleFrom <= lastDay;
    return {
      season: key,
      name: monthName(season),
      initial: monthName(season).charAt(0),
      total: weeks.reduce((sum, w) => sum + w.points, 0),
      sessions: weeks.reduce((sum, w) => sum + w.validSessions, 0),
      records: weeks.reduce((sum, w) => sum + w.records, 0),
      isOpen: key === toLocalISODate(current),
      isAvailable: !isFuture && isVisible,
    };
  });
}

/** "Fecha em 31 out · faltam 7 dias" · "Fechado em 31 out". */
export function seasonStatusHint(season: Date, today: Date): string {
  const lastDay = new Date(season.getFullYear(), season.getMonth() + 1, 0);
  const isOpen = toLocalISODate(seasonOf(today)) === toLocalISODate(season);
  if (!isOpen) return `Fechado em ${shortDay(lastDay)}`;
  const left = Math.max(0, Math.round((lastDay.getTime() - startOfDay(today).getTime()) / 86_400_000));
  return `Fecha em ${shortDay(lastDay)} · ${left === 0 ? "último dia" : left === 1 ? "falta 1 dia" : `faltam ${left} dias`}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "Outubro de 2026" → título do mês no extrato ("Outubro 2026"). */
export function statementMonthTitle(season: Date): string {
  return `${monthName(season)} ${season.getFullYear()}`;
}

/** "+15" · "+11,1" · "0" */
export function pointsDeltaLabel(points: number): string {
  if (points <= 0) return "0";
  const rounded = Math.round(points * 10) / 10;
  return `+${formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1)}`;
}

/** Linha de constância do treino: por que rendeu (ou não) pontos. */
export function sessionOutcomeLine(day: StatementDay, minMinutes: number): { title: string; detail: string } {
  const minutes = `${formatNumber(Math.round(day.minutes), 0)} min`;
  if (day.outcome === "counted") return { title: "Dia de treino válido", detail: `${minutes} · conta 1 por dia` };
  if (day.outcome === "short") return { title: "Treino curto", detail: `${minutes} · vale a partir de ${formatNumber(minMinutes, 0)} min` };
  return { title: "Outro treino valeu mais", detail: `${minutes} · no mesmo dia conta só o de maior volume` };
}

/** Linha de recordes do treino (o limite da semana pode cortar parte). */
export function sessionRecordsLine(day: StatementDay, recordPoints: number): { title: string; detail: string } {
  const plural = day.recordCount === 1 ? "1 recorde" : `${day.recordCount} recordes`;
  const paid = recordPoints > 0 ? day.recordPoints / recordPoints : 0;
  const capped = paid < day.recordCount ? " · limite da semana atingido" : "";
  return { title: "Recordes", detail: `${plural} · ${formatNumber(recordPoints, 0)} pts cada${capped}` };
}

/** Linhas da semana: sequência e volume (pontos que não são de um treino só). */
export function weekSourceLine(week: StatementWeekView, source: "streak" | "volume"): { title: string; detail: string } {
  if (source === "streak") {
    return week.fulfilled
      ? { title: "Sequência", detail: "Semana cumprida · soma com as semanas seguidas" }
      : { title: "Sequência", detail: "Semana não cumprida · a sequência recomeça" };
  }
  return { title: "Volume da semana", detail: `${formatNumber(Math.round(week.weeklyVolumeKg), 0)} kg · comparado à sua média` };
}
