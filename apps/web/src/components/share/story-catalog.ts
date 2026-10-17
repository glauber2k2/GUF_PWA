import type { ComponentType } from "react";
import type { StoryData } from "@guf/core";
import { Story16, Story17, Story18 } from "./models/photo";
import { Story19, Story20, Story20B, Story20C, Story20D, Story21, Story37, Story38 } from "./models/sheet";
import { Story23, Story24, Story36 } from "./models/week";
import { Story25, Story26, Story27 } from "./models/evolution";
import { Story28, Story29, Story30, Story31, Story32, Story33, Story35 } from "./models/frame";
import { StoryC01, StoryC02, StoryC03, StoryC04, StoryC05, StoryC09, StoryC10, StoryC11, StoryC12 } from "./models/cards";
import { Story39 } from "./models/comparison";
import { StoryF01, StoryF02, StoryF03, StoryF04, StoryF05, StoryF06, StoryF07, StoryF08, StoryF09, StoryF10 } from "./models/fullscreen";
import { Story01, Story02, Story03 } from "./models/muscle-map";
import { Story04, Story05, Story06 } from "./models/numbers";
import { Story08 } from "./models/rat";
import { Story10, Story11, Story12 } from "./models/record";
import { StoryS01, StoryS02, StoryS03, StoryS04, StoryS05, StoryS06, StoryS07, StoryS08, StoryS09, StoryS10, StoryS11 } from "./models/stickers-a";
import { StoryS12, StoryS13, StoryS14, StoryS15, StoryS16, StoryS17, StoryS18, StoryS19, StoryS20, StoryS21, StoryS22 } from "./models/stickers-b";
import { Story13, Story14, Story15 } from "./models/streak";
import type { StoryFormat, StoryModelProps } from "./story-types";

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
  "Cartões",
  "Tela cheia",
  "Stickers",
] as const;

export interface StoryModel {
  /** Número do modelo no Claude Design ("01", "20b"…). */
  id: string;
  name: string;
  /** Índice em STORY_STYLES. */
  style: number;
  Component: ComponentType<StoryModelProps>;
  /** Formato da imagem (padrão: story 1080 × 1920). */
  format?: StoryFormat;
  /** Só aparece quando o dado existe (ex.: recorde, sequência). */
  available?: (d: StoryData) => boolean;
}

const hasRecord = (d: StoryData) => d.records.length > 0;
const hasStreak = (d: StoryData) => d.streak.current > 0;
const hasComparison = (d: StoryData) => d.comparison !== null;
const hasGoal = (d: StoryData) => (d.week.goal ?? 0) > 0;
const hasFeatured = (d: StoryData) => d.featured !== null;
const hasProject = (d: StoryData) => d.project !== null;
const hasRest = (d: StoryData) => d.restAverage !== null;
const hasTopMuscle = (d: StoryData) => d.topMuscle !== null;

/**
 * Os 37 modelos do design (ShareSheetScreen.dc.html · ALL, na ordem do carrossel), a comparação de
 * peso (Comparacoes de Peso.dc.html) e o canvas "Compartilhamento – PNGs" (cartões C, telas cheias F e
 * stickers S). Modelo novo = nova entrada aqui.
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
  // Cartões de resumo (ShareCard · C01–C12; C06–C08 são iguais a C02–C04 e ficaram de fora)
  { id: "c01", name: "Resumo com boneco", style: 11, Component: StoryC01 },
  { id: "c02", name: "Volume em destaque", style: 11, Component: StoryC02 },
  { id: "c03", name: "Recordes do treino", style: 11, Component: StoryC03, available: hasRecord },
  { id: "c04", name: "Treino finalizado", style: 11, Component: StoryC04 },
  { id: "c05", name: "Resumo com boneco e Guf Rat", style: 11, Component: StoryC05 },
  { id: "c09", name: "Resumo com boneco · Feed", style: 11, Component: StoryC09, format: "feed" },
  { id: "c10", name: "Volume em destaque · Feed", style: 11, Component: StoryC10, format: "feed" },
  { id: "c11", name: "Recordes do treino · Feed", style: 11, Component: StoryC11, format: "feed", available: hasRecord },
  { id: "c12", name: "Treino finalizado · Feed", style: 11, Component: StoryC12, format: "feed" },
  // Tela cheia (F01–F10)
  { id: "f01", name: "Treino concluído", style: 12, Component: StoryF01 },
  { id: "f02", name: "Sequência", style: 12, Component: StoryF02, available: hasStreak },
  { id: "f03", name: "Ficha de treino", style: 12, Component: StoryF03 },
  { id: "f04", name: "Recorde pessoal", style: 12, Component: StoryF04, available: hasRecord },
  { id: "f05", name: "Volume da semana", style: 12, Component: StoryF05 },
  { id: "f06", name: "Resumo do mês", style: 12, Component: StoryF06 },
  { id: "f07", name: "Carga subiu", style: 12, Component: StoryF07, available: hasFeatured },
  { id: "f08", name: "Projeto", style: 12, Component: StoryF08, available: hasProject },
  { id: "f09", name: "Números + boneco", style: 12, Component: StoryF09 },
  { id: "f10", name: "Meta da semana", style: 12, Component: StoryF10, available: hasGoal },
  // Stickers (S01–S22; só a forma, fundo transparente)
  { id: "s01", name: "Sequência · pílula", style: 13, Component: StoryS01, format: "sticker", available: hasStreak },
  { id: "s02", name: "Sequência · selo", style: 13, Component: StoryS02, format: "sticker", available: hasStreak },
  { id: "s03", name: "Semana de treinos", style: 13, Component: StoryS03, format: "sticker" },
  { id: "s04", name: "Ficha de treino", style: 13, Component: StoryS04, format: "sticker" },
  { id: "s05", name: "Ficha com boneco", style: 13, Component: StoryS05, format: "sticker" },
  { id: "s06", name: "Volume total", style: 13, Component: StoryS06, format: "sticker" },
  { id: "s07", name: "Tempo de treino", style: 13, Component: StoryS07, format: "sticker" },
  { id: "s08", name: "Métricas + boneco", style: 13, Component: StoryS08, format: "sticker" },
  { id: "s09", name: "Recorde dourado", style: 13, Component: StoryS09, format: "sticker", available: hasRecord },
  { id: "s10", name: "Recorde · Guf Rat", style: 13, Component: StoryS10, format: "sticker", available: hasRecord },
  { id: "s11", name: "Treino concluído · Guf Rat", style: 13, Component: StoryS11, format: "sticker" },
  { id: "s12", name: "Dia de treino · Guf Rat", style: 13, Component: StoryS12, format: "sticker" },
  { id: "s13", name: "Músculo do dia", style: 13, Component: StoryS13, format: "sticker", available: hasTopMuscle },
  { id: "s14", name: "Mapa muscular da semana", style: 13, Component: StoryS14, format: "sticker" },
  { id: "s15", name: "Evolução do 1RM", style: 13, Component: StoryS15, format: "sticker", available: hasFeatured },
  { id: "s16", name: "Meta da semana · Anel", style: 13, Component: StoryS16, format: "sticker", available: hasGoal },
  { id: "s17", name: "Recibo do treino", style: 13, Component: StoryS17, format: "sticker" },
  { id: "s18", name: "Descanso médio", style: 13, Component: StoryS18, format: "sticker", available: hasRest },
  { id: "s19", name: "Marco de treinos", style: 13, Component: StoryS19, format: "sticker" },
  { id: "s20", name: "Números empilhados", style: 13, Component: StoryS20, format: "sticker" },
  { id: "s21", name: "Comparação de peso", style: 13, Component: StoryS21, format: "sticker", available: hasComparison },
  { id: "s22", name: "Ficha lateral + boneco", style: 13, Component: StoryS22, format: "sticker" },
];

/** Modelos que fazem sentido para este treino (sem recorde, some o estilo Recorde etc.). */
export function availableStoryModels(d: StoryData): StoryModel[] {
  return STORY_MODELS.filter((m) => !m.available || m.available(d));
}
