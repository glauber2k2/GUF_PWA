"use client";

import { useState } from "react";
import { Check, Copy, History, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { AiFeedback } from "@guf/api";
import { toAnswerParagraphs } from "@guf/core";
import { Icon, IconButton } from "@/shared/components/ds";
import { getMessageText, hasUsedHistory } from "@/features/ai/helpers/ai-messages";
import type { AiUIMessage } from "@/features/ai/type";

/** Tempo do "copiado" no botão de copiar. */
const COPIED_MS = 1500;

/** Pergunta da pessoa: bolha à direita. */
export function AiUserMessage({ message }: { message: AiUIMessage }) {
  return (
    <div className="flex animate-guf-rise-fast flex-col">
      <div className="max-w-[82%] self-end rounded-[18px_18px_6px_18px] bg-ai-bubble px-3.5 py-2.5 text-[15px] leading-[22px] [overflow-wrap:anywhere] whitespace-pre-wrap text-fg">
        {getMessageText(message)}
      </div>
    </div>
  );
}

interface AiAnswerProps {
  message: AiUIMessage;
  isStreaming: boolean;
  isLast: boolean;
  feedback: AiFeedback | null;
  onCopy: (text: string) => void;
  onFeedback: (value: AiFeedback) => void;
  onRegenerate: () => void;
}

/** Resposta do GUF AI: selo de histórico, parágrafos, cursor enquanto escreve e ações no fim. */
export function AiAnswer({ message, isStreaming, isLast, feedback, onCopy, onFeedback, onRegenerate }: AiAnswerProps) {
  const [isCopied, setIsCopied] = useState(false);
  const text = getMessageText(message);
  const paragraphs = toAnswerParagraphs(text);
  if (paragraphs.length === 0 && !isStreaming) return null;

  const copy = () => {
    onCopy(paragraphs.join("\n\n"));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_MS);
  };

  return (
    <div className="flex animate-guf-rise-fast flex-col gap-2.5">
      {hasUsedHistory(message) && (
        <span className="inline-flex h-6 items-center gap-1.5 self-start rounded-pill border border-border bg-surface px-2.5 text-xs text-fg-muted">
          <Icon icon={History} size={13} />
          Usou seu histórico
        </span>
      )}
      <div className="flex flex-col gap-2.5 text-[15px] leading-[23px] text-pretty text-fg">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {isStreaming && <span aria-hidden="true" className="-mt-1.5 block h-4 w-2 animate-guf-ai-caret rounded-[2px] bg-accent-text" />}
      {!isStreaming && (
        <div className="-mt-1.5 -ml-3 flex animate-guf-rise-fast items-center">
          <IconButton icon={isCopied ? Check : Copy} label="Copiar resposta" variant="ghost" onClick={copy} />
          <IconButton icon={ThumbsUp} label="Resposta útil" variant="ghost" pressed={feedback === 1} onClick={() => onFeedback(1)} className={feedback === 1 ? "text-accent-text" : undefined} />
          <IconButton icon={ThumbsDown} label="Resposta não ajudou" variant="ghost" pressed={feedback === -1} onClick={() => onFeedback(-1)} className={feedback === -1 ? "text-fg" : undefined} />
          {isLast && <IconButton icon={RefreshCw} label="Gerar de novo" variant="ghost" onClick={onRegenerate} />}
        </div>
      )}
    </div>
  );
}
