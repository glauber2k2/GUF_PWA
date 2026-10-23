"use client";

import { useState } from "react";
import { normalizeHandle } from "@guf/core";
import { useHandleAvailability } from "@/features/people/api/use-people";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

const HANDLE_MESSAGES = {
  invalid: "Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.",
  taken: "Esse @ já está em uso. Tente outro.",
  same: "Esse já é o @ atual. Digite um novo.",
} as const;

/** Novo @ com a disponibilidade conferida enquanto digita (o banco confere de novo ao salvar). */
export function useHandleField(userId: string) {
  const [value, setValue] = useState("");
  const handle = normalizeHandle(value);
  const debounced = useDebouncedValue(handle, 350);
  const availability = useHandleAvailability(userId, debounced, true);
  const status = debounced === handle ? availability.data : undefined;

  return {
    value,
    setValue,
    handle,
    isValid: handle.length > 0 && status === "available",
    error: handle && status && status !== "available" ? HANDLE_MESSAGES[status] : undefined,
    hint: status === "available" ? `@${handle} está disponível.` : undefined,
  };
}
