import type { ComponentType } from "react";
import type { StoryData } from "@guf/core";
import { Story16, Story17, Story18 } from "@/features/share/components/models/photo";
import { Story19, Story20, Story20B, Story20C, Story20D, Story21, Story37, Story38 } from "@/features/share/components/models/sheet";
import { Story23, Story24, Story36 } from "@/features/share/components/models/week";
import { Story25, Story26, Story27 } from "@/features/share/components/models/evolution";
import { Story28, Story29, Story30, Story31, Story32, Story33, Story35 } from "@/features/share/components/models/frame";
import { StoryC01, StoryC02, StoryC03, StoryC04, StoryC05, StoryC09, StoryC10, StoryC11, StoryC12 } from "@/features/share/components/models/cards";
import { Story39 } from "@/features/share/components/models/comparison";
import { StoryF01, StoryF02, StoryF03, StoryF04, StoryF05, StoryF06, StoryF07, StoryF08, StoryF09, StoryF10 } from "@/features/share/components/models/fullscreen";
import { Story01, Story02, Story03 } from "@/features/share/components/models/muscle-map";
import { Story04, Story05, Story06 } from "@/features/share/components/models/numbers";
import { Story08 } from "@/features/share/components/models/rat";
import { StoryCardio01 } from "@/features/share/components/models/cardio";
import { Story10, Story11, Story12 } from "@/features/share/components/models/record";
import { StoryS01, StoryS02, StoryS03, StoryS04, StoryS05, StoryS06, StoryS07, StoryS08, StoryS09, StoryS10, StoryS11 } from "@/features/share/components/models/stickers-a";
import { StoryS12, StoryS13, StoryS14, StoryS15, StoryS16, StoryS17, StoryS18, StoryS19, StoryS20, StoryS22 } from "@/features/share/components/models/stickers-b";
import { Story13, Story14, Story15 } from "@/features/share/components/models/streak";
import type { StoryFormat, StoryModelProps } from "@/features/share/type";

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
  "Cardio",
] as const;

/** Formato exibido na folha, ao lado do estilo. */
export const STORY_FORMAT_LABELS: Record<StoryFormat, string> = {
  story: "Story 9:16",
  feed: "Feed 4:5",
  sticker: "Adesivo sem fundo",
};

export interface StoryModel {
  /** Número do modelo na folha ("01", "02"…), sequencial pela ordem do carrossel. */
  id: string;
  /** Título exibido na folha (o estilo e o formato aparecem abaixo dele). */
  name: string;
  /** Índice em STORY_STYLES. */
  style: number;
  Component: ComponentType<StoryModelProps>;
  /** Formato da imagem (padrão: story 1080 × 1920). */
  format?: StoryFormat;
  /**
   * Tem cartões com informação: a imagem sai sem fundo e a opacidade escolhida vale para os cartões e
   * as bordas. Sem isso, a opacidade vale para o fundo da imagem. Conferido modelo a modelo pelo DOM
   * em 2026-10-20 (superfície com texto dentro; trilhos de barras e anéis sem texto não contam).
   */
  hasCards?: boolean;
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
const hasCardio = (d: StoryData) => d.cardio !== null;
/** Estilo Cardio: vem primeiro no carrossel quando o treino é só de cardio. */
const CARDIO_STYLE = STORY_STYLES.indexOf("Cardio");

/**
 * Modelos na ordem do carrossel: os 37 do design (ShareSheetScreen.dc.html · ALL), a comparação de peso
 * (Comparacoes de Peso.dc.html) e o canvas "Compartilhamento – PNGs" (cartões, telas cheias e stickers).
 * O nome do componente guarda a referência do design (Story20B, StoryC09, StoryS12…); o número exibido é
 * sequencial e se ajusta sozinho. Modelo novo = nova entrada aqui.
 */
const MODELS: readonly Omit<StoryModel, "id">[] = [
  // Mapa muscular
  { name: "Frente e costas", style: 0, hasCards: true, Component: Story01 },
  { name: "Boneco em destaque", style: 0, Component: Story02 },
  { name: "Boneco com resumo embaixo", style: 0, hasCards: true, Component: Story03 },
  // Números
  { name: "Volume gigante", style: 1, Component: Story04 },
  { name: "Números em coluna", style: 1, Component: Story05 },
  { name: "Selo do Anel", style: 1, Component: Story06 },
  // Guf Rat
  { name: "Guf Rat com balão de fala", style: 2, hasCards: true, Component: Story08 },
  // Recorde
  { name: "Troféu do recorde", style: 3, hasCards: true, Component: Story10, available: hasRecord },
  { name: "Recorde: antes e agora", style: 3, Component: Story11, available: hasRecord },
  { name: "Selo dourado do recorde", style: 3, hasCards: true, Component: Story12, available: hasRecord },
  // Sequência
  { name: "Chama da sequência", style: 4, Component: Story13, available: hasStreak },
  { name: "Linha de semanas", style: 4, Component: Story14, available: hasStreak },
  { name: "Adesivo de sequência", style: 4, hasCards: true, Component: Story15, available: hasStreak },
  // Sobre a foto
  { name: "Faixa no rodapé", style: 5, hasCards: true, Component: Story16 },
  { name: "Resumo no canto", style: 5, hasCards: true, Component: Story17 },
  { name: "Coluna lateral", style: 5, hasCards: true, Component: Story18 },
  // Ficha
  { name: "Recibo do treino", style: 6, hasCards: true, Component: Story19 },
  { name: "Tabela com boneco", style: 6, Component: Story20 },
  { name: "Boneco no topo", style: 6, hasCards: true, Component: Story20B },
  { name: "Cartões por exercício", style: 6, hasCards: true, Component: Story20C },
  { name: "Tabela de volume", style: 6, hasCards: true, Component: Story20D },
  { name: "Volume por exercício", style: 6, Component: Story21 },
  { name: "Treino de hoje com boneco", style: 6, hasCards: true, Component: Story37 },
  { name: "Treino de hoje com Guf Rat", style: 6, hasCards: true, Component: Story38 },
  // Semana
  { name: "Gráfico de volume", style: 7, Component: Story23 },
  { name: "Meta da semana", style: 7, Component: Story24 },
  { name: "Calendário do mês", style: 7, hasCards: true, Component: Story36 },
  // Evolução
  { name: "Guf Rat e boneco", style: 8, hasCards: true, Component: Story25 },
  { name: "Mês a mês", style: 8, Component: Story26 },
  { name: "Músculos do mês", style: 8, Component: Story27 },
  // Moldura
  { name: "Moldura simples", style: 9, hasCards: true, Component: Story28 },
  { name: "Ingresso", style: 9, hasCards: true, Component: Story29 },
  { name: "Assinatura no rodapé", style: 9, Component: Story30 },
  { name: "Cantoneiras", style: 9, Component: Story31 },
  { name: "Polaroide", style: 9, Component: Story32 },
  { name: "Assinatura vertical", style: 9, Component: Story33 },
  { name: "Moldura do Anel", style: 9, hasCards: true, Component: Story35 },
  // Comparação
  { name: "Comparação de peso", style: 10, hasCards: true, Component: Story39, available: hasComparison },
  // Cartões de resumo (C06–C08 do design são iguais a C02–C04 e ficaram de fora; C09–C12 em feed)
  { name: "Resumo com boneco", style: 11, Component: StoryC01 },
  { name: "Volume em destaque", style: 11, Component: StoryC02 },
  { name: "Recordes do treino", style: 11, hasCards: true, Component: StoryC03, available: hasRecord },
  { name: "Treino finalizado", style: 11, Component: StoryC04 },
  { name: "Resumo com boneco e Guf Rat", style: 11, Component: StoryC05 },
  { name: "Resumo com boneco", style: 11, Component: StoryC09, format: "feed" },
  { name: "Volume em destaque", style: 11, Component: StoryC10, format: "feed" },
  { name: "Recordes do treino", style: 11, hasCards: true, Component: StoryC11, format: "feed", available: hasRecord },
  { name: "Treino finalizado", style: 11, Component: StoryC12, format: "feed" },
  // Tela cheia
  { name: "Treino concluído", style: 12, hasCards: true, Component: StoryF01 },
  { name: "Semanas seguidas", style: 12, hasCards: true, Component: StoryF02, available: hasStreak },
  { name: "Ficha de treino completa", style: 12, hasCards: true, Component: StoryF03 },
  { name: "Recorde pessoal", style: 12, hasCards: true, Component: StoryF04, available: hasRecord },
  { name: "Volume da semana", style: 12, hasCards: true, Component: StoryF05 },
  { name: "Resumo do mês", style: 12, hasCards: true, Component: StoryF06 },
  { name: "Carga em alta", style: 12, hasCards: true, Component: StoryF07, available: hasFeatured },
  { name: "Treinos do projeto", style: 12, Component: StoryF08, available: hasProject },
  { name: "Números e boneco", style: 12, Component: StoryF09 },
  { name: "Meta da semana", style: 12, hasCards: true, Component: StoryF10, available: hasGoal },
  // Stickers (só a forma, fundo transparente; a opacidade vale para o próprio adesivo)
  { name: "Sequência em pílula", style: 13, hasCards: true, Component: StoryS01, format: "sticker", available: hasStreak },
  { name: "Sequência em selo", style: 13, hasCards: true, Component: StoryS02, format: "sticker", available: hasStreak },
  { name: "Semana de treinos", style: 13, hasCards: true, Component: StoryS03, format: "sticker" },
  { name: "Ficha de treino", style: 13, hasCards: true, Component: StoryS04, format: "sticker" },
  { name: "Ficha com boneco", style: 13, hasCards: true, Component: StoryS05, format: "sticker" },
  { name: "Volume total", style: 13, hasCards: true, Component: StoryS06, format: "sticker" },
  { name: "Tempo de treino", style: 13, hasCards: true, Component: StoryS07, format: "sticker" },
  { name: "Métricas e boneco", style: 13, hasCards: true, Component: StoryS08, format: "sticker" },
  { name: "Recorde dourado", style: 13, hasCards: true, Component: StoryS09, format: "sticker", available: hasRecord },
  { name: "Recorde com Guf Rat", style: 13, hasCards: true, Component: StoryS10, format: "sticker", available: hasRecord },
  { name: "Treino concluído com Guf Rat", style: 13, hasCards: true, Component: StoryS11, format: "sticker" },
  { name: "Dia de treino com Guf Rat", style: 13, hasCards: true, Component: StoryS12, format: "sticker" },
  { name: "Músculo do dia", style: 13, hasCards: true, Component: StoryS13, format: "sticker", available: hasTopMuscle },
  { name: "Mapa muscular da semana", style: 13, hasCards: true, Component: StoryS14, format: "sticker" },
  { name: "Evolução do 1RM", style: 13, hasCards: true, Component: StoryS15, format: "sticker", available: hasFeatured },
  { name: "Meta da semana em anel", style: 13, hasCards: true, Component: StoryS16, format: "sticker", available: hasGoal },
  { name: "Recibo recortado", style: 13, hasCards: true, Component: StoryS17, format: "sticker" },
  { name: "Descanso médio", style: 13, hasCards: true, Component: StoryS18, format: "sticker", available: hasRest },
  { name: "Marco de treinos", style: 13, hasCards: true, Component: StoryS19, format: "sticker" },
  { name: "Números e bonecos", style: 13, hasCards: true, Component: StoryS20, format: "sticker" },
  { name: "Ficha lateral com bonecos", style: 13, hasCards: true, Component: StoryS22, format: "sticker" },
  // Cardio (no fim do catálogo para não mudar o número dos modelos que já existiam)
  { name: "Tempo, distância e ritmo", style: CARDIO_STYLE, hasCards: true, Component: StoryCardio01, available: hasCardio },
];

/** Catálogo com os números sequenciais (01, 02…). */
export const STORY_MODELS: readonly StoryModel[] = MODELS.map((model, i) => ({ ...model, id: String(i + 1).padStart(2, "0") }));

/** Modelos que fazem sentido para este treino (sem recorde, some o estilo Recorde etc.); só cardio = Cardio primeiro. */
export function availableStoryModels(d: StoryData): StoryModel[] {
  const models = STORY_MODELS.filter((m) => !m.available || m.available(d));
  if (!d.cardio || d.exerciseCount > 0) return models;
  return [...models.filter((m) => m.style === CARDIO_STYLE), ...models.filter((m) => m.style !== CARDIO_STYLE)];
}
