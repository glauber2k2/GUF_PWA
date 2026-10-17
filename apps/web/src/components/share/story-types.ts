import type { StoryData } from "@guf/core";

/** Props de todos os modelos de story (arte 1080 × 1920). */
export interface StoryModelProps {
  d: StoryData;
}

/** Assinatura no rodapé das imagens (endereço público do app). */
export const STORY_DOMAIN = "gufapp.vercel.app";
export const STORY_SIGNATURE_LEAD = "Registrado com";
export const STORY_SIGNATURE = `${STORY_SIGNATURE_LEAD} ${STORY_DOMAIN}`;

/** Tamanho da arte exportada (stories do Instagram). */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
