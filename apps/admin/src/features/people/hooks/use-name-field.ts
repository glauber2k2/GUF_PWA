"use client";

import { useState } from "react";
import { staffNameSchema } from "@guf/schemas";

/** Novo nome do perfil: mesmos limites do Perfil e diferente do atual. */
export function useNameField(currentName: string | null) {
  const [value, setValue] = useState(currentName ?? "");
  const name = value.trim();
  const parsed = staffNameSchema.safeParse(value);
  const isChanged = name !== (currentName ?? "").trim();

  return {
    value,
    setValue,
    name,
    isValid: isChanged && parsed.success,
    error: isChanged && !parsed.success ? parsed.error.issues[0]?.message : undefined,
  };
}
