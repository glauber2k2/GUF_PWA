"use client";

import { powerUp7Sound } from "@/lib/power-up-7";
import { createDevicePreference } from "@/lib/device-preference";
import { decodeAudioData, getAudioContext, playSound } from "@/lib/sound-engine";

/*
 * Aviso de fim do descanso (Som · Vibrar · Silencioso), guardado NO APARELHO como o tema.
 * "Som" toca o efeito power-up-7 (soundcn, CC0, embutido no JS: funciona offline) e também vibra.
 * Navegadores (principalmente o Safari do iPhone) só liberam o áudio depois de um toque:
 * primeRestAlert() roda no toque que inicia o descanso, para o som poder tocar quando ele acabar.
 * Com o app em segundo plano ou a tela bloqueada, o aviso pode atrasar ou não tocar.
 */

export type RestAlertPreference = "sound" | "vibrate" | "silent";

/** Dois pulsos longos: perceptível no bolso e diferente dos toques curtos (15 ms) das séries. */
const VIBRATION_PATTERN = [400, 150, 400];
/** Voltou ao app até este tempo depois do fim do descanso: ainda vibra (depois disso, só o aviso na tela). */
const LATE_VIBRATION_MS = 2 * 60_000;

const preference = createDevicePreference<RestAlertPreference>("guf.rest-alert", ["sound", "vibrate", "silent"], "sound");
const readPreference = preference.read;
export const setRestAlertPreference = preference.set;
export const useRestAlertPreference = preference.use;

let cancelLateVibration: (() => void) | null = null;

function vibrateNow() {
  try {
    navigator.vibrate(VIBRATION_PATTERN);
  } catch {
    // Alguns navegadores bloqueiam a vibração sem gesto do usuário.
  }
}

/**
 * O Chrome ignora navigator.vibrate com a página oculta (outro app aberto, tela bloqueada).
 * Nesse caso a vibração espera o usuário voltar ao app. Sem a API (iPhone), não faz nada.
 * Com o Android no modo silencioso, o próprio Chrome não vibra.
 */
function vibrate() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  cancelLateVibration?.();
  if (document.visibilityState === "visible") {
    vibrateNow();
    return;
  }
  const endedAt = Date.now();
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    cancelLateVibration?.();
    if (Date.now() - endedAt <= LATE_VIBRATION_MS) vibrateNow();
  };
  document.addEventListener("visibilitychange", onVisible);
  cancelLateVibration = () => {
    document.removeEventListener("visibilitychange", onVisible);
    cancelLateVibration = null;
  };
}

/** Chamar DENTRO de um toque: libera o áudio e já decodifica o som. */
export function primeRestAlert() {
  // Novo descanso: esquece a vibração atrasada do anterior.
  cancelLateVibration?.();
  if (readPreference() !== "sound") return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    void decodeAudioData(powerUp7Sound.dataUri).catch(() => {});
  } catch {
    // Navegador sem Web Audio: fica só a vibração.
  }
}

/** Avisa o fim do descanso conforme a preferência (ou a informada, para a prévia no Perfil). */
export function playRestAlert(preference: RestAlertPreference = readPreference()) {
  if (preference === "silent") return;
  vibrate();
  if (preference !== "sound") return;
  try {
    void playSound(powerUp7Sound.dataUri).catch(() => {});
  } catch {
    // Navegador sem Web Audio: fica só a vibração.
  }
}
