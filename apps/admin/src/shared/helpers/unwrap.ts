import type { ApiResult } from "@guf/api";

/** `{ data, error }` → dado ou erro lançado (o TanStack Query guarda o erro para a tela). */
export async function unwrap<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const { data, error } = await result;
  if (error) throw error;
  return data;
}
