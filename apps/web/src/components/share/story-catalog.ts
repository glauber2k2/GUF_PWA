import type { ComponentType } from "react";
import type { StoryData } from "@guf/core";
import { Story16, Story17, Story18 } from "./models/photo";
import { Story19, Story20, Story20B, Story20C, Story20D, Story21, Story37, Story38 } from "./models/sheet";
import { Story23, Story24, Story36 } from "./models/week";
import { Story25, Story26, Story27 } from "./models/evolution";
import { Story28, Story29, Story30, Story31, Story32, Story33, Story35 } from "./models/frame";
import { Story39 } from "./models/comparison";
import { Story01, Story02, Story03 } from "./models/muscle-map";
import { Story04, Story05, Story06 } from "./models/numbers";
import { Story08 } from "./models/rat";
import { Story10, Story11, Story12 } from "./models/record";
import { Story13, Story14, Story15 } from "./models/streak";
import type { StoryModelProps } from "./story-types";

/** Estilos (chips da folha), na ordem do design. */
export const STORY_STYLES = [
  "Mapa muscular",
  "Números",
  "Guf Rat",
  "Recorde",
  "Sequência",
  "Sobre a foto",
  "Ficha",
  "Semana",
  "Evolução",
  "Moldura",
  "Comparação",
] as const;

export interface StoryModel {
  /** Número do modelo no Claude Design ("01", "20b"…). */
  id: string;
  name: string;
  /** Índice em STORY_STYLES. */
  style: number;
  Component: ComponentType<StoryModelProps>;
  /** Só aparece quando o dado existe (ex.: recorde, sequência). */
  available?: (d: StoryData) => boolean;
}

const hasRecord = (d: StoryData) => d.records.length > 0;
const hasStreak = (d: StoryData) => d.streak.current > 0;
const hasComparison = (d: StoryData) => d.comparison !== null;

/**
 * Os 37 modelos do design (ShareSheetScreen.dc.html · ALL, na ordem do carrossel) e a comparação de
 * peso (Comparacoes de Peso.dc.html, sticker S21). Modelo novo = nova entrada aqui.
 */
export const STORY_MODELS: readonly StoryModel[] = [
  { id: "01", name: "Frente e costas", style: 0, Component: Story01 },
  { id: "02", name: "Boneco herói", style: 0, Component: Story02 },
  { id: "03", name: "Cartão inferior", style: 0, Component: Story03 },
  { id: "04", name: "Volume gigante", style: 1, Component: Story04 },
  { id: "05", name: "Empilhado", style: 1, Component: Story05 },
  { id: "06", name: "Selo do Anel", style: 1, Component: Story06 },
  { id: "08", name: "Balão de fala", style: 2, Component: Story08 },
  { id: "10", name: "Troféu", style: 3, Component: Story10, available: hasRecord },
  { id: "11", name: "Antes e agora", style: 3, Component: Story11, available: hasRecord },
  { id: "12", name: "Selo dourado", style: 3, Component: Story12, available: hasRecord },
  { id: "13", name: "Chama", style: 4, Component: Story13, available: hasStreak },
  { id: "14", name: "Linha de semanas", style: 4, Component: Story14, available: hasStreak },
  { id: "15", name: "Adesivo de sequência", style: 4, Component: Story15, available: hasStreak },
  { id: "16", name: "Faixa inferior", style: 5, Component: Story16 },
  { id: "17", name: "Canto", style: 5, Component: Story17 },
  { id: "18", name: "Coluna lateral", style: 5, Component: Story18 },
  { id: "19", name: "Recibo", style: 6, Component: Story19 },
  { id: "20", name: "Tabela com boneco", style: 6, Component: Story20 },
  { id: "20b", name: "Boneco no topo", style: 6, Component: Story20B },
  { id: "20c", name: "Cartões por exercício", style: 6, Component: Story20C },
  { id: "20d", name: "Tabela de volume", style: 6, Component: Story20D },
  { id: "21", name: "Volume por exercício", style: 6, Component: Story21 },
  { id: "37", name: "Treino de hoje com boneco", style: 6, Component: Story37 },
  { id: "38", name: "Treino de hoje com Guf Rat", style: 6, Component: Story38 },
  { id: "23", name: "Gráfico de volume", style: 7, Component: Story23 },
  { id: "24", name: "Meta da semana", style: 7, Component: Story24 },
  { id: "36", name: "Calendário do mês", style: 7, Component: Story36 },
  { id: "25", name: "Rat e boneco", style: 8, Component: Story25 },
  { id: "26", name: "Mês a mês", style: 8, Component: Story26 },
  { id: "27", name: "Músculos do mês", style: 8, Component: Story27 },
  { id: "28", name: "Moldura", style: 9, Component: Story28 },
  { id: "29", name: "Ticket", style: 9, Component: Story29 },
  { id: "30", name: "Assinatura", style: 9, Component: Story30 },
  { id: "31", name: "Cantoneiras", style: 9, Component: Story31 },
  { id: "32", name: "Polaroid", style: 9, Component: Story32 },
  { id: "33", name: "Assinatura vertical", style: 9, Component: Story33 },
  { id: "35", name: "Moldura do Anel", style: 9, Component: Story35 },
  { id: "39", name: "Comparação de peso", style: 10, Component: Story39, available: hasComparison },
];

/** Modelos que fazem sentido para este treino (sem recorde, some o estilo Recorde etc.). */
export function availableStoryModels(d: StoryData): StoryModel[] {
  return STORY_MODELS.filter((m) => !m.available || m.available(d));
}
