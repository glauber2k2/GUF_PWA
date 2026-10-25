"use client";

import { useEffect, useState } from "react";

/** Valor que só muda depois de `delay` ms sem alteração (busca enquanto digita, sem uma consulta por tecla). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
