import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromLocalISODate } from "./dates";
import { shiftSeason } from "./competition";

/**
 * Pódio do campeão (Claude Design "Podio Encerrado" · 1c): nos 3 primeiros dias de uma temporada,
 * o top 3 por pontos da temporada encerrada. Quem entra e quando vem do servidor
 * (get_competition_season_podium); aqui ficam só os textos.
 */

/** Um lugar do pódio final: a pessoa e os pontos da temporada encerrada. */
export interface SeasonPodiumPlace {
  userId: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  isMe: boolean;
  points: number;
  rank: number;
}

/** Pódio final de uma temporada (1º dia do mês, "AAAA-MM-01"), do 1º ao 3º. */
export interface SeasonPodium {
  season: string;
  places: SeasonPodiumPlace[];
}

function monthName(season: Date): string {
  return format(season, "MMMM", { locale: ptBR });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Setembro · encerrada" */
export function seasonPodiumCaption(season: string): string {
  return `${capitalize(monthName(fromLocalISODate(season)))} · encerrada`;
}

/** "Lucas venceu setembro" · "Você venceu setembro" (sem nome, o @). */
export function seasonWinnerTitle(winner: Pick<SeasonPodiumPlace, "name" | "handle" | "isMe">, season: string): string {
  const who = winner.isMe ? "Você" : (winner.name?.split(" ")[0] ?? `@${winner.handle}`);
  return `${who} venceu ${monthName(fromLocalISODate(season))}`;
}

/** "Outubro já começou. Todos voltam a zero." */
export function nextSeasonNotice(season: string): string {
  return `${capitalize(monthName(shiftSeason(fromLocalISODate(season), 1)))} já começou. Todos voltam a zero.`;
}
