/**
 * Faixa sólida atrás da barra de status do iPhone (PWA instalado, `black-translucent` + `viewport-fit=cover`):
 * sem ela, o conteúdo que rola por baixo do relógio aparece borrado pelos cabeçalhos translúcidos.
 * Altura = área segura do topo (0 no navegador comum e no Android), cor do fundo do tema.
 */
export function StatusBarBackdrop() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background" />;
}
