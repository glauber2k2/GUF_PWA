"use client";

import { useState, type KeyboardEvent, type RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { AI_MESSAGE_MAX_CHARS } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Altura máxima do campo antes de rolar (px). */
const MAX_INPUT_PX = 120;

interface AiComposerProps {
  /** Campo de texto (o painel foca ao abrir). */
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isBusy: boolean;
  isDisabled: boolean;
  /** Teclado virtual aberto: o campo sobe com uma animação e o rodapé dispensa a área segura. */
  isKeyboardOpen: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** Campo da pergunta: cresce até 5 linhas, Enter envia (Shift+Enter quebra linha), parar durante a resposta. */
export function AiComposer({ inputRef, isBusy, isDisabled, isKeyboardOpen, onSend, onStop }: AiComposerProps) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0 && !isBusy && !isDisabled;

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_PX)}px`;
  };

  const send = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
    const el = inputRef.current;
    if (el) requestAnimationFrame(() => resize(el));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };

  return (
    <footer
      className={cn(
        "flex flex-none flex-col gap-2 bg-background px-3 pt-2",
        // Com o teclado aberto a barra de gestos fica atrás dele: sem a área segura embaixo.
        isKeyboardOpen ? "pb-3" : "pb-[calc(12px+env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-[26px] border border-border bg-surface p-1.5 transition-[border-color,box-shadow,background] duration-150 ease-standard focus-within:border-ai-focus-border focus-within:bg-surface-elevated focus-within:shadow-ai-focus",
          // Recolocar a classe reinicia a animação a cada abertura do teclado.
          isKeyboardOpen && "animate-guf-ai-lift",
        )}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          maxLength={AI_MESSAGE_MAX_CHARS}
          disabled={isDisabled}
          onChange={(event) => {
            setText(event.target.value);
            resize(event.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Pergunte ao GUF AI"
          aria-label="Mensagem para o GUF AI"
          className="max-h-[120px] min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 pl-2 text-base leading-6 text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed"
        />
        {isBusy ? (
          <button
            type="button"
            aria-label="Parar resposta"
            onClick={onStop}
            className="grid size-10 flex-none animate-guf-pop-in cursor-pointer place-items-center rounded-pill bg-fg text-background transition-transform duration-100 active:scale-[.94]"
          >
            <span className="size-3 rounded-[3px] bg-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Enviar"
            disabled={!canSend}
            onClick={send}
            className={cn(
              "grid size-10 flex-none place-items-center rounded-pill transition-[background,color,transform] duration-200 ease-overshoot active:scale-[.94]",
              canSend ? "cursor-pointer bg-accent text-accent-foreground" : "scale-[.92] bg-surface-3 text-fg-muted",
            )}
          >
            <Icon icon={ArrowUp} size={20} />
          </button>
        )}
      </div>
      <span className="text-center text-[11px] leading-[14px] text-fg-muted">O GUF AI pode errar. Confira as cargas antes de treinar.</span>
    </footer>
  );
}
