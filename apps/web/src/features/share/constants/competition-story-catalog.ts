import type { CompetitionStory } from "@guf/core";
import { StoryP01, StoryP02, StoryP04, StoryP05, StoryP06, StoryP08, StoryP09, StoryP11, StoryP13, StoryP14, StoryP15 } from "@/features/share/components/models/competition";
import type { StoryModel } from "@/features/share/constants/story-catalog";

/** Estilos (chips da folha da competição), na ordem do design. */
export const COMPETITION_STORY_STYLES = ["Competição", "Reta final"] as const;

const COMPETITION = 0;
const FINAL_STRETCH = 1;

const hasPoints = (d: CompetitionStory) => d.hasPoints;
const hasClimbed = (d: CompetitionStory) => d.climbed > 0;
const hasGapToFirst = (d: CompetitionStory) => d.gapToFirst !== null;
const hasSources = (d: CompetitionStory) => d.sources.length > 0;
const hasCurve = (d: CompetitionStory) => d.cumulativePct.length >= 2;
const endsToday = (d: CompetitionStory) => d.countdown !== null;

/**
 * Stickers da competição (PNGs Competicao e Cardio.dc.html · P01–P15), todos sem fundo. Cada um só
 * aparece quando o dado existe (ex.: "1º lugar" só para quem lidera). Modelo novo = nova entrada aqui.
 */
const MODELS: readonly Omit<StoryModel<CompetitionStory>, "id">[] = [
  { name: "Sua posição subiu", style: COMPETITION, hasCards: true, Component: StoryP01, format: "sticker", available: hasClimbed },
  { name: "Pontos por semana", style: COMPETITION, hasCards: true, Component: StoryP02, format: "sticker", available: hasPoints },
  { name: "Falta pouco pro topo", style: COMPETITION, hasCards: true, Component: StoryP04, format: "sticker", available: hasGapToFirst },
  { name: "Selo do Anel · Top 3", style: COMPETITION, hasCards: true, Component: StoryP05, format: "sticker", available: (d) => d.isTopThree },
  { name: "Recibo de pontos", style: COMPETITION, hasCards: true, Component: StoryP06, format: "sticker", available: hasSources },
  { name: "Curva de pontos", style: COMPETITION, hasCards: true, Component: StoryP08, format: "sticker", available: hasCurve },
  { name: "Faixa de líder", style: COMPETITION, hasCards: true, Component: StoryP09, format: "sticker", available: (d) => d.isLeader },
  { name: "Ultrapassagem", style: COMPETITION, hasCards: true, Component: StoryP14, format: "sticker", available: hasClimbed },
  { name: "Contagem regressiva", style: FINAL_STRETCH, hasCards: true, Component: StoryP11, format: "sticker", available: endsToday },
  { name: "Vantagem apertada", style: FINAL_STRETCH, hasCards: true, Component: StoryP13, format: "sticker", available: (d) => d.isCloseLead },
  { name: "Eco frenético", style: FINAL_STRETCH, hasCards: true, Component: StoryP15, format: "sticker", available: hasPoints },
];

export const COMPETITION_STORY_MODELS: readonly StoryModel<CompetitionStory>[] = MODELS.map((model, i) => ({ ...model, id: String(i + 1).padStart(2, "0") }));

/** Modelos que valem para a sua competição agora. */
export function availableCompetitionStoryModels(d: CompetitionStory): StoryModel<CompetitionStory>[] {
  return COMPETITION_STORY_MODELS.filter((m) => !m.available || m.available(d));
}
