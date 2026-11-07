/**
 * Caminhos internos (redirecionamento depois do login, botão de comunicado).
 *
 * Só "/algo" dentro do próprio site. Bloqueia redirecionamento aberto: "//site", "/\site", URLs
 * absolutas e caracteres de controle ou espaço, que o navegador descarta ao montar a URL
 * ("/\t/site" vira "//site" e sai do domínio). Sem esses, um texto que começa com uma única "/"
 * não tem como apontar para outra origem.
 */

// eslint-disable-next-line no-control-regex -- de propósito: caracteres de controle são o ataque.
const UNSAFE_CHARACTERS = /[\u0000- \u007f\\]/;

/**
 * Confere se o valor é um caminho do próprio site.
 * @returns o próprio caminho, ou null quando ele poderia levar a outro site.
 */
export function toInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (UNSAFE_CHARACTERS.test(value)) return null;
  return value;
}
