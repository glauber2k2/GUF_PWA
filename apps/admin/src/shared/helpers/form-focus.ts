/**
 * Ordem dos campos de um formulário do painel (diálogo ou tela) para andar só com o teclado.
 * Campo = texto, data, número, lista de opções, caixa de marcar, interruptor e grupo de opções
 * (o grupo conta como uma parada só: a opção marcada ou a primeira).
 */

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[role="switch"]:not([disabled])',
  '[role="radiogroup"]',
].join(", ");

/** Botão principal de um formulário (Confirmar, Salvar, Continuar). Marcar com `PRIMARY_ACTION_PROPS`. */
export const PRIMARY_ACTION_PROPS = { "data-primary-action": "" } as const;
/** Rodapé de botões do diálogo: sem botão marcado, o último daqui é o principal (Cancelar vem antes). */
export const ACTIONS_ATTRIBUTE = "data-dialog-actions";

function isVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

/** Parada do grupo de opções: a marcada ou, sem nenhuma, a primeira. */
function radioStop(group: HTMLElement): HTMLElement | null {
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')];
  return radios.find((r) => r.getAttribute("aria-checked") === "true") ?? radios[0] ?? null;
}

/** Campos visíveis do contêiner, na ordem da tela. */
export function formFields(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FIELD_SELECTOR)]
    .map((element) => (element.getAttribute("role") === "radiogroup" ? radioStop(element) : element))
    .filter((element): element is HTMLElement => element !== null && isVisible(element));
}

/** Põe o foco no primeiro campo. Devolve false quando não há campo (quem chama decide o que focar). */
export function focusFirstField(container: HTMLElement): boolean {
  const first = formFields(container)[0];
  first?.focus();
  return Boolean(first);
}

const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";

/** Foco ao abrir: o primeiro campo ou, sem campo (ex.: confirmação), o primeiro elemento clicável. */
export function focusInitial(container: HTMLElement): void {
  if (focusFirstField(container)) return;
  container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
}

/** Campo do formulário que contém o elemento (a opção de um grupo vale pelo grupo). */
function fieldIndexOf(fields: HTMLElement[], target: HTMLElement): number {
  const group = target.getAttribute("role") === "radio" ? target.closest<HTMLElement>('[role="radiogroup"]') : null;
  return fields.findIndex((field) => field === target || (group !== null && group.contains(field)));
}

function primaryAction(container: HTMLElement): HTMLButtonElement | null {
  const marked = container.querySelector<HTMLButtonElement>("[data-primary-action]:not([disabled])");
  if (marked) return marked;
  const buttons = [...container.querySelectorAll<HTMLButtonElement>(`[${ACTIONS_ATTRIBUTE}] button:not([disabled])`)];
  return buttons[buttons.length - 1] ?? null;
}

/**
 * Enter num campo: vai para o próximo; no último, aciona o botão principal.
 * @returns false quando o Enter não era de um campo deste formulário (segue o normal).
 */
export function advanceFromField(container: HTMLElement, target: HTMLElement): boolean {
  const fields = formFields(container);
  const index = fieldIndexOf(fields, target);
  if (index < 0) return false;
  const next = fields[index + 1];
  if (next) {
    next.focus();
    return true;
  }
  primaryAction(container)?.click();
  return true;
}

/** Leva o foco a um campo pelo id (atalho F de busca e filtros). Devolve false se ele não existe. */
export function focusFieldById(id: string): boolean {
  const field = document.getElementById(id);
  field?.focus();
  return Boolean(field);
}
