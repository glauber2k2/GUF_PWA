/*
 * Comparações de peso (Claude Design "Comparacoes de Peso"): o volume do treino vira um objeto
 * do dia a dia que o Guf Rat "levanta" — de uma barra olímpica (20 kg) à Estátua da Liberdade (200 t).
 * Regras puras: catálogo (só cresce; o desenho de cada `kind` fica no app) e a escolha pelo volume.
 */

/** Desenho do objeto (cada um tem a sua ilustração no app). */
export type WeightObjectKind =
  | "barra"
  | "saco"
  | "lavar"
  | "geladeira"
  | "moto"
  | "tigre"
  | "piano"
  | "cavalo"
  | "touro"
  | "carro"
  | "suv"
  | "rino"
  | "pickup"
  | "iate"
  | "elefante"
  | "trator"
  | "trex"
  | "caminhao"
  | "onibus"
  | "carregado"
  | "jubarte"
  | "aviao"
  | "vagao"
  | "azul"
  | "estatua";

/** Esforço do Guf Rat na arte (pose e expressão), pelo peso levantado. */
export type LiftEffort = "light" | "normal" | "heavy" | "impossible";

export interface WeightComparison {
  kind: WeightObjectKind;
  /** Peso de referência do objeto, em kg. */
  kg: number;
  /** "Iate pequeno" */
  name: string;
  /** "Você levantou um iate!" */
  phrase: string;
}

/** Os 25 objetos do design, do mais leve ao mais pesado (W01–W25). */
export const WEIGHT_COMPARISONS: readonly WeightComparison[] = [
  { kind: "barra", kg: 20, name: "Barra olímpica", phrase: "Você levantou uma barra olímpica!" },
  { kind: "saco", kg: 50, name: "Saco de pancadas", phrase: "Um saco de pancadas inteiro!" },
  { kind: "lavar", kg: 80, name: "Máquina de lavar", phrase: "Você levantou uma máquina de lavar!" },
  { kind: "geladeira", kg: 120, name: "Geladeira", phrase: "Uma geladeira saiu do chão!" },
  { kind: "moto", kg: 200, name: "Moto esportiva", phrase: "Você levantou uma moto!" },
  { kind: "tigre", kg: 300, name: "Tigre", phrase: "A força de levantar um tigre!" },
  { kind: "piano", kg: 450, name: "Piano de cauda", phrase: "Você levantou um piano!" },
  { kind: "cavalo", kg: 600, name: "Cavalo", phrase: "Isso equivale a um cavalo!" },
  { kind: "touro", kg: 800, name: "Touro", phrase: "Você levantou um touro!" },
  { kind: "carro", kg: 1000, name: "Carro compacto", phrase: "Você levantou um carro!" },
  { kind: "suv", kg: 1500, name: "SUV", phrase: "Um SUV inteiro!" },
  { kind: "rino", kg: 2000, name: "Rinoceronte", phrase: "Você levantou um rinoceronte!" },
  { kind: "pickup", kg: 3000, name: "Caminhonete", phrase: "Você levantou uma caminhonete!" },
  { kind: "iate", kg: 4000, name: "Iate pequeno", phrase: "Você levantou um iate!" },
  { kind: "elefante", kg: 5000, name: "Elefante", phrase: "Isso equivale a um elefante!" },
  { kind: "trator", kg: 7000, name: "Trator", phrase: "Você levantou um trator!" },
  { kind: "trex", kg: 8000, name: "Tiranossauro rex", phrase: "Você levantou um T-Rex!" },
  { kind: "caminhao", kg: 10000, name: "Caminhão", phrase: "Você levantou um caminhão!" },
  { kind: "onibus", kg: 15000, name: "Ônibus urbano", phrase: "Você levantou um ônibus!" },
  { kind: "carregado", kg: 20000, name: "Caminhão carregado", phrase: "Você levantou um caminhão carregado!" },
  { kind: "jubarte", kg: 30000, name: "Baleia-jubarte", phrase: "Você levantou uma baleia!" },
  { kind: "aviao", kg: 70000, name: "Boeing 737", phrase: "Você levantou um avião!" },
  { kind: "vagao", kg: 100000, name: "Vagão ferroviário", phrase: "Você levantou um vagão de trem!" },
  { kind: "azul", kg: 140000, name: "Baleia-azul", phrase: "Você levantou uma baleia-azul!" },
  { kind: "estatua", kg: 200000, name: "Estátua da Liberdade", phrase: "Você levantou a Estátua da Liberdade!" },
];

/** O objeto mais pesado que cabe no volume (kg); abaixo de 20 kg não há comparação. */
export function pickWeightComparison(volumeKg: number): WeightComparison | null {
  let match: WeightComparison | null = null;
  for (const item of WEIGHT_COMPARISONS) if (item.kg <= volumeKg) match = item;
  return match;
}

/** Pose do Guf Rat pelo peso: leve até 200 kg, normal até 2 t, pesado até 20 t, depois "o impossível". */
export function liftEffort(kg: number): LiftEffort {
  if (kg <= 200) return "light";
  if (kg <= 2000) return "normal";
  if (kg <= 20000) return "heavy";
  return "impossible";
}
