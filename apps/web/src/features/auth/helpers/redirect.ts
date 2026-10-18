/**
 * Valida o destino do ?next= para evitar redirecionamento aberto:
 * só caminhos internos ("/algo"), nunca "//site", "/\site" ou URLs absolutas.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/login") || next.startsWith("/cadastro")) return null;
  return next;
}

/** Monta /login?next=<rota atual> (rota interna já validada). */
export function loginPathFor(pathname: string, search: string): string {
  const current = `${pathname}${search ? `?${search}` : ""}`;
  return current === "/" ? "/login" : `/login?next=${encodeURIComponent(current)}`;
}
