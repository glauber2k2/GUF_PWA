// Mesmas regras de seasonOf/seasonRange em packages/core (a Edge Function não importa os pacotes do monorepo).
const SATURDAY = 6;
const DAYS_IN_WEEK = 7;

const atNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/** Temporada da data: mês do sábado que fecha a semana ("AAAA-MM-01"). */
export function seasonStart(day: string): string {
  const date = atNoon(day);
  date.setUTCDate(date.getUTCDate() + SATURDAY - date.getUTCDay());
  return `${toIso(date).slice(0, 7)}-01`;
}

/** Dias da temporada: do domingo da 1ª semana cujo sábado cai no mês até o último sábado do mês. */
export function seasonRange(season: string): { from: string; to: string } {
  const first = atNoon(season);
  const firstSaturday = new Date(first);
  firstSaturday.setUTCDate(first.getUTCDate() + ((SATURDAY - first.getUTCDay() + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  const from = new Date(firstSaturday);
  from.setUTCDate(firstSaturday.getUTCDate() - SATURDAY);
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  const to = new Date(lastDay);
  to.setUTCDate(lastDay.getUTCDate() - ((lastDay.getUTCDay() - SATURDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  return { from: toIso(from), to: toIso(to) };
}
