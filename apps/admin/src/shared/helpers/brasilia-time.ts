/** Horário de Brasília: o painel mostra e grava as datas nesse fuso (sem horário de verão). */
export const PANEL_TIME_ZONE = "America/Sao_Paulo";
const BRASILIA_OFFSET = "-03:00";

/** Campos "Data" e "Hora" (Brasília) → instante ISO. Vazio = null. */
export function toBrasiliaIso(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}:00${BRASILIA_OFFSET}`).toISOString();
}

/** Instante ISO → campos "Data" (aaaa-mm-dd) e "Hora" (hh:mm) em Brasília. */
export function fromBrasiliaIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PANEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Campo de data "2027-10-22" → fim do dia em Brasília, em ISO (validade "até o dia"). Vazio = null. */
export function endOfDayBrasiliaIso(day: string): string | null {
  return toBrasiliaIso(day, "23:59");
}

/** Campo de data "2027-10-22" → "22/10/2027". */
export function formatDateField(day: string): string {
  return day.split("-").reverse().join("/");
}
