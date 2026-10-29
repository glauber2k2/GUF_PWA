import type { Ref } from "react";

/** Entrega o elemento a um ref de quem usa o componente (função ou objeto). */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}
