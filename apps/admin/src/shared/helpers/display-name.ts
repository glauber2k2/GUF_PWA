/** Nome para mostrar quando a pessoa não preencheu. */
export function displayName(name: string | null, handle: string | null): string {
  return name?.trim() || (handle ? `@${handle}` : "Sem nome");
}
