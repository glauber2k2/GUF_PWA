"use client";

import { powerUp7Sound } from "@/lib/power-up-7";
import { createDevicePreference } from "@/lib/device-preference";
import { decodeAudioData, getAudioContext, playSound } from "@/lib/sound-engine";

/*
 * Aviso de fim do descanso (Som · Silencioso), guardado NO APARELHO como o tema.
 * "Som" toca o efeito power-up-7 (soundcn, CC0, embutido no JS: funciona offline).
 * Navegadores (principalmente o Safari do iPhone) só liberam o áudio depois de um toque:
 * primeRestAlert() roda no toque que inicia o descanso, para o som poder tocar quando ele acabar.
 * Com o app em segundo plano ou a tela bloqueada, o aviso pode atrasar ou não tocar.
 */

export type RestAlertPreference = "sound" | "silent";

const preference = createDevicePreference<RestAlertPreference>("guf.rest-alert", ["sound", "silent"], "sound");
const readPreference = preference.read;
export const setRestAlertPreference = preference.set;
export const useRestAlertPreference = preference.use;

/** Chamar DENTRO de um toque: libera o áudio e já decodifica o som. */
export function primeRestAlert() {
  if (readPreference() !== "sound") return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    void decodeAudioData(powerUp7Sound.dataUri).catch(() => {});
  } catch {
    // Navegador sem Web Audio: sem som.
  }
}

/** Avisa o fim do descanso conforme a preferência (ou a informada, para a prévia no Perfil). */
export function playRestAlert(preference: RestAlertPreference = readPreference()) {
  if (preference !== "sound") return;
  try {
    void playSound(powerUp7Sound.dataUri).catch(() => {});
  } catch {
    // Navegador sem Web Audio: sem som.
  }
}
