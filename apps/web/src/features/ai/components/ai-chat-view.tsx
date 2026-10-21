"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ChevronDown, SquarePen } from "lucide-react";
import type { AiConversation } from "@guf/api";
import { Banner, GufLoader, Icon, IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { useAppShell } from "@/features/app-shell";
import { AiComposer } from "@/features/ai/components/ai-composer";
import { AiEmptyState } from "@/features/ai/components/ai-empty-state";
import { AiMark } from "@/features/ai/components/ai-mark";
import { AiAnswer, AiUserMessage } from "@/features/ai/components/ai-message";
import { useAiChat } from "@/features/ai/hooks/use-ai-chat";
import { useAiMessageFeedback } from "@/features/ai/hooks/use-ai-message-feedback";
import { useStickToBottom } from "@/features/ai/hooks/use-stick-to-bottom";
import type { AiPhase } from "@/features/ai/type";

/** Espera a animação de abertura antes de focar o campo (o teclado não sobe no meio dela). */
const FOCUS_DELAY_MS = 380;

const STATUS_TEXT: Record<AiPhase, string> = { idle: "Online", thinking: "Pensando…", streaming: "Digitando…" };

interface AiChatViewProps {
  conversation: AiConversation;
  greeting: string;
  isOnline: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

/** Conversa do GUF AI: cabeçalho, mensagens com rolagem que acompanha a resposta e o campo da pergunta. */
export function AiChatView({ conversation, greeting, isOnline, onClose, onNewChat }: AiChatViewProps) {
  const { showToast } = useAppShell();
  const chat = useAiChat(conversation);
  const feedback = useAiMessageFeedback();
  const listRef = useRef<HTMLDivElement>(null);
  const scroll = useStickToBottom(listRef, chat.messages);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = chat.messages.length === 0 && chat.phase === "idle";
  const isBusy = chat.phase !== "idle";

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const ask = (text: string) => {
    scroll.scrollToBottom();
    chat.send(text);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Resposta copiada", { tone: "success", haptic: false });
    } catch {
      showToast("Não foi possível copiar", { tone: "error", message: "Selecione o texto da resposta e copie manualmente." });
    }
  };

  const lastIndex = chat.messages.length - 1;

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex h-[60px] flex-none items-center gap-2.5 border-b border-border bg-background/90 pr-2 pl-1 backdrop-blur-[12px]">
        <IconButton icon={ChevronDown} label="Fechar GUF AI" variant="ghost" onClick={onClose} />
        <span className="grid size-9 flex-none place-items-center rounded-[12px] bg-accent text-accent-foreground">
          <AiMark size={22} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-base leading-5 font-semibold tracking-[-0.01em]">GUF AI</strong>
          <span
            className={cn("text-xs leading-4 transition-colors duration-200", isBusy ? "text-accent-text" : "text-fg-muted")}
            aria-live="polite"
          >
            {isOnline ? STATUS_TEXT[chat.phase] : "Sem conexão"}
          </span>
        </div>
        <IconButton icon={SquarePen} label="Nova conversa" variant="ghost" disabled={isEmpty || isBusy} onClick={onNewChat} />
      </header>

      <div
        ref={listRef}
        onScroll={scroll.onScroll}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pt-5 pb-6"
      >
        {!isOnline && (
          <Banner tone="warning" title="Sem conexão">
            para falar com o GUF AI, conecte-se à internet.
          </Banner>
        )}

        {isEmpty && <AiEmptyState greeting={greeting} isDisabled={!isOnline} onAsk={ask} />}

        {chat.messages.map((message, index) =>
          message.role === "user" ? (
            <AiUserMessage key={message.id} message={message} />
          ) : (
            <AiAnswer
              key={message.id}
              message={message}
              isStreaming={index === lastIndex && chat.phase === "streaming"}
              isLast={index === lastIndex && !isBusy && isOnline}
              feedback={feedback.feedbackOf(message)}
              onCopy={copy}
              onFeedback={(value) => feedback.toggle(message, value)}
              onRegenerate={() => {
                scroll.scrollToBottom();
                chat.regenerate();
              }}
            />
          ),
        )}

        {chat.phase === "thinking" && (
          <div className="flex animate-guf-rise-fast items-center gap-2.5">
            <GufLoader variant={8} size={18} tone="brand" text={chat.thinkingLabel} textSize={14} />
          </div>
        )}

        {chat.error && !isBusy && (
          <Banner tone="danger" actionLabel="Tentar de novo" onAction={chat.retry}>
            {chat.error.message}
          </Banner>
        )}
      </div>

      {scroll.isAwayFromBottom && (
        <button
          type="button"
          aria-label="Ir para a última mensagem"
          onClick={scroll.scrollToBottom}
          className="absolute bottom-[116px] left-1/2 z-[2] -ml-5 grid size-10 animate-guf-pop-in cursor-pointer place-items-center rounded-pill border border-border bg-surface-elevated text-fg shadow-e3"
        >
          <Icon icon={ArrowDown} size={18} />
        </button>
      )}

      <AiComposer inputRef={inputRef} isBusy={isBusy} isDisabled={!isOnline} onSend={ask} onStop={chat.stop} />
    </div>
  );
}
