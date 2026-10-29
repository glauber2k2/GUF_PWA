"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { ChevronDown, Ellipsis, GripVertical, NotepadText } from "lucide-react";
import { Collapse, Icon, IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Modo de reordenar do treino (useHoldReorder): card compacto, balançando; o arrastado segue o dedo. */
export interface ExerciseCardReorder {
  index: number;
  total: number;
  dragging: boolean;
  /** Deslocamento do card arrastado acompanhando o dedo (px). */
  dragOffset: number;
}

/** O que todo card de exercício recebe da lista, qualquer que seja o tipo de medida. */
export interface ExerciseCardFrameProps {
  /** Atraso da animação de entrada (ms), escalonado pela posição. */
  enterDelayMs: number;
  onToggleOpen: () => void;
  onOpenMenu: () => void;
  /** Tocar no quadro do exercício (ícone/foto) abre a evolução dele; sem isso, o quadro só abre/recolhe. */
  onOpenExercise?: () => void;
  /** Segurar o cabeçalho liga o modo de reordenar (useHoldReorder). */
  holdProps?: HTMLAttributes<HTMLElement>;
  /**
   * Modo de reordenar: o MESMO card fica compacto (só o cabeçalho, altura fixa) e balança. Não troca
   * de componente: no toque, o gesto que ligou o modo continua no elemento tocado — se ele saísse da
   * página, o navegador entregaria o resto do arraste a um elemento removido.
   */
  reorder?: ExerciseCardReorder;
}

export interface ExerciseCardShellProps extends ExerciseCardFrameProps {
  name: string;
  open: boolean;
  /** Destaque volt ao entrar (adicionado, trocado ou desfeito). */
  flash: boolean;
  note: string | null;
  /** Imagem do exercício no quadro do cabeçalho (ExerciseImage). */
  image: ReactNode;
  /** Algo acontecendo agora no exercício (ex.: cronômetro do cardio contando): ícone e borda em volt. */
  isLive?: boolean;
  /** Linha de etiquetas abaixo do nome; `compact` = modo de reordenar (cabe numa linha). */
  meta: (compact: boolean) => ReactNode;
  /** Resumo mostrado com o card recolhido (ex.: total e play do cardio). */
  collapsedContent?: ReactNode;
  /** Conteúdo do card aberto (séries). */
  children: ReactNode;
}

/**
 * Moldura de um exercício no treino: cabeçalho (tocar abre/recolhe; segurar reordena), menu,
 * observação e o conteúdo do tipo de medida (força, cardio…). Não sabe como as séries são.
 */
export function ExerciseCardShell({
  name,
  open,
  flash,
  note,
  image,
  isLive = false,
  meta,
  collapsedContent,
  children,
  enterDelayMs,
  onToggleOpen,
  onOpenMenu,
  onOpenExercise,
  holdProps,
  reorder,
}: ExerciseCardShellProps) {
  const tile = (
    <span
      className={cn(
        "grid size-11 flex-none place-items-center overflow-hidden rounded-md transition-colors duration-[250ms] ease-standard",
        isLive ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg-secondary",
      )}
    >
      {image}
    </span>
  );
  // Com destino, o quadro fica fora do botão de abrir/recolher (botão dentro de botão não é permitido).
  const opensExercise = Boolean(onOpenExercise) && !reorder;

  return (
    <article
      aria-label={reorder ? `${name}, posição ${reorder.index + 1} de ${reorder.total}` : name}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      className={cn(
        "flex-none overflow-hidden rounded-lg border bg-surface-elevated select-none [-webkit-touch-callout:none]",
        !reorder && "transition-[border-color] duration-[250ms] ease-standard",
        !reorder && (isLive ? "border-accent/55" : "border-border"),
        !reorder && (flash ? "animate-guf-flash" : "animate-guf-rise-fast"),
        reorder && "relative h-[80px] cursor-grab touch-none",
        reorder && "transition-[scale,box-shadow,border-color] duration-150 ease-standard",
        reorder &&
          (reorder.dragging
            ? "z-20 scale-[1.03] cursor-grabbing border-accent-text shadow-e3"
            : "animate-guf-wiggle border-border motion-reduce:animate-none"),
      )}
      // Entrada escalonada; no modo de reordenar, balanço desencontrado e posição do card arrastado (valores dinâmicos).
      style={
        reorder
          ? reorder.dragging
            ? { translate: `0 ${reorder.dragOffset}px` }
            : { animationDelay: `${-((reorder.index * 97) % 300)}ms` }
          : flash
            ? undefined
            : { animationDelay: `${enterDelayMs}ms` }
      }
    >
      {/* Segurar o cabeçalho: reordenar. Sem menu de contexto nem seleção de texto ao segurar. */}
      <div {...holdProps} className="flex items-start gap-1 pr-2 select-none [-webkit-touch-callout:none]">
        {opensExercise && (
          <button
            type="button"
            aria-label={`Ver evolução de ${name}`}
            onClick={onOpenExercise}
            className="mt-3.5 ml-4 flex-none cursor-pointer rounded-md bg-transparent transition-transform duration-150 ease-standard active:scale-95 motion-reduce:transition-none"
          >
            {tile}
          </button>
        )}
        {/* Toque em qualquer parte do cabeçalho abre/recolhe (não só na seta). */}
        <button
          type="button"
          aria-expanded={reorder ? undefined : open}
          aria-label={`${open ? "Recolher" : "Expandir"} ${name}`}
          tabIndex={reorder ? -1 : undefined}
          onClick={reorder ? undefined : onToggleOpen}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg bg-transparent pt-3.5 pb-3 text-left text-fg",
            opensExercise ? "pl-2" : "pl-4",
          )}
        >
          {!opensExercise && tile}
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            {/* No modo de reordenar o card tem altura fixa (REORDER_CARD_PX): o nome fica em uma linha. */}
            <span className={cn("text-[17px] leading-[22px] font-semibold", reorder ? "truncate" : "line-clamp-2 [overflow-wrap:anywhere]")}>
              {name}
            </span>
            <span className={cn("flex items-center gap-1.5", reorder ? "flex-nowrap overflow-hidden" : "flex-wrap")}>{meta(Boolean(reorder))}</span>
          </span>
        </button>
        {/* No modo de reordenar: alça no lugar dos botões (eles ficam ocultos, não saem da página). */}
        {reorder && (
          <span aria-hidden="true" className="grid size-11 flex-none place-items-center self-center text-fg-muted">
            <Icon icon={GripVertical} size={20} />
          </span>
        )}
        <div className={cn("flex flex-none items-center gap-0.5 pt-3.5", reorder && "hidden")}>
          <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${name}`} onClick={onOpenMenu} />
          {/* Seta só indica o estado: o cabeçalho inteiro já é o botão (fora da ordem do Tab). */}
          <span aria-hidden="true" onClick={onToggleOpen} className="grid size-11 cursor-pointer place-items-center text-fg-secondary">
            <Icon
              icon={ChevronDown}
              size={20}
              className={cn("transition-transform duration-200 ease-standard motion-reduce:transition-none", open && "rotate-180")}
            />
          </span>
        </div>
      </div>

      {note && (
        <span className={cn("-mt-1 flex items-start gap-1.5 pr-4 pb-2.5 pl-[72px] text-[13px] leading-[18px] text-fg-secondary", reorder && "hidden")}>
          <Icon icon={NotepadText} size={14} className="mt-0.5 text-fg-muted" />
          {note}
        </span>
      )}

      {collapsedContent && !open && !reorder && <div className="animate-guf-rise-fast">{collapsedContent}</div>}

      <Collapse open={open && !reorder}>{children}</Collapse>
    </article>
  );
}

/** Altura fixa do card no modo de reordenar (cabeçalho só): o arraste calcula o destino por "slot". */
export const REORDER_CARD_PX = 80;
/** Espaço entre os cards na lista do treino (gap-3). */
export const WORKOUT_LIST_GAP_PX = 12;
