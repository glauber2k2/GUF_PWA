import { toInternalPath } from "@guf/core";

/**
 * Valida o destino do ?next= para evitar redirecionamento aberto: só caminhos internos
 * (`toInternalPath`), e nunca de volta para o login ou o cadastro.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  const path = toInternalPath(next);
  if (!path || path.startsWith("/login") || path.startsWith("/cadastro")) return null;
  return path;
}

/** Monta /login?next=<rota atual> (rota interna já validada). */
export function loginPathFor(pathname: string, search: string): string {
  const current = `${pathname}${search ? `?${search}` : ""}`;
  return current === "/" ? "/login" : `/login?next=${encodeURIComponent(current)}`;
}
