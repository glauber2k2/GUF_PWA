"use client";

import { useSyncExternalStore } from "react";

/*
 * Preferência guardada NO APARELHO (localStorage), sem coluna no banco: funciona offline e
 * atualiza todas as telas que a usam. O tema tem implementação própria (script antes da pintura).
 */

export interface DevicePreference<T extends string> {
  read: () => T;
  set: (value: T) => void;
  use: () => [T, (value: T) => void];
}

export function createDevicePreference<T extends string>(key: string, values: readonly T[], fallback: T): DevicePreference<T> {
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const value = localStorage.getItem(key);
      return values.includes(value as T) ? (value as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const set = (value: T) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Sem armazenamento (navegação privada): vale só até fechar.
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  };

  const use = (): [T, (value: T) => void] => [useSyncExternalStore(subscribe, read, () => fallback), set];

  return { read, set, use };
}
