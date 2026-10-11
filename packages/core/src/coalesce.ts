/**
 * Agrupa gravações repetidas e rápidas (ex.: tocar várias vezes em "+" da meta semanal) em UMA requisição.
 * Puro (sem React): usado pelo hook useCoalescedSave do web e reaproveitável no app mobile.
 *
 * - Cada `schedule(valor)` substitui o anterior e reinicia a espera (`delayMs`): só o ÚLTIMO valor é enviado.
 * - Nunca há duas gravações ao mesmo tempo: se mudar durante o envio, o novo valor sai quando o atual terminar.
 * - `skip(valor)` evita enviar o que já está salvo (ex.: 4 → 5 → 4 não gera requisição).
 * - `flush()` envia já o que estiver esperando (ao sair da tela).
 */

export interface CoalescedSaverOptions<T> {
  save: (value: T) => Promise<void>;
  delayMs?: number;
  skip?: (value: T) => boolean;
  /** Relógio injetável (testes). */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

export interface CoalescedSaver<T> {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  /** Há valor esperando ou sendo enviado. */
  isBusy: () => boolean;
}

export const COALESCE_DELAY_MS = 600;

/** Temporizador do ambiente (navegador ou React Native); o core não depende dos tipos do DOM. */
const timers = globalThis as unknown as {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export function createCoalescedSaver<T>({
  save,
  delayMs = COALESCE_DELAY_MS,
  skip = () => false,
  setTimer = (fn, ms) => timers.setTimeout(fn, ms),
  clearTimer = (id) => timers.clearTimeout(id),
}: CoalescedSaverOptions<T>): CoalescedSaver<T> {
  let pending: { value: T } | null = null;
  let timer: unknown = null;
  let inFlight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    timer = null;
    // Já enviando: o valor novo sai quando o envio atual terminar.
    if (inFlight || !pending) return inFlight ?? undefined;
    const { value } = pending;
    pending = null;
    if (skip(value)) return;
    inFlight = (async () => {
      try {
        await save(value);
      } catch {
        // Quem chama trata o erro dentro de `save`; o agrupador só segue para o próximo valor.
      }
    })();
    await inFlight;
    inFlight = null;
    // Mudou durante o envio e a espera já passou: envia o mais recente.
    if (pending && timer === null) await run();
  };

  return {
    schedule(value) {
      pending = { value };
      if (timer !== null) clearTimer(timer);
      timer = setTimer(() => void run(), delayMs);
    },
    async flush() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      if (inFlight) await inFlight;
      await run();
    },
    isBusy: () => pending !== null || inFlight !== null,
  };
}
