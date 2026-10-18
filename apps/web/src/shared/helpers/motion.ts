/** Usuário pediu menos movimento (prefers-reduced-motion): animações em JS devem ser puladas. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
