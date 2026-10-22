"use client";

import { CircleCheck, Image as ImageIcon, Info, Sparkles, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { ANNOUNCEMENT_TONES, type AnnouncementTone } from "@guf/core";
import { cn } from "../helpers/class-names";
import { Button } from "./actions";
import { Icon } from "./brand";

/**
 * Comunicado do painel nos 4 formatos (protótipo ComPreview). O mesmo componente desenha o app e a
 * prévia do painel: o formato muda só a moldura; conteúdo, tom e ações são os mesmos.
 */

export const ANNOUNCEMENT_TONE_STYLES: Record<AnnouncementTone, { icon: LucideIcon; text: string; tint: string; border: string }> = {
  info: { icon: Info, text: "text-info", tint: "bg-banner-info", border: "border-info/35" },
  success: { icon: CircleCheck, text: "text-success", tint: "bg-banner-success", border: "border-success/35" },
  warning: { icon: TriangleAlert, text: "text-warning", tint: "bg-banner-warning", border: "border-warning/35" },
  news: { icon: Sparkles, text: "text-accent-text", tint: "bg-accent-tile", border: "border-accent-text/35" },
};

export interface AnnouncementContentProps {
  tone: AnnouncementTone;
  title: string;
  body: string;
  ctaLabel?: string | null;
  /** Mostra o espaço da imagem (só tela cheia e modal). */
  hasImage?: boolean;
  onCta?: () => void;
  onDismiss?: () => void;
  className?: string;
}

function ToneLabel({ tone }: { tone: AnnouncementTone }) {
  const style = ANNOUNCEMENT_TONE_STYLES[tone];
  return (
    <span className={cn("flex items-center gap-1.5 text-overline font-semibold tracking-[.08em] uppercase", style.text)}>
      <Icon icon={style.icon} size={14} />
      {ANNOUNCEMENT_TONES[tone].label}
    </span>
  );
}

function ImageSlot({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid place-items-center rounded-lg bg-surface-3 text-fg-muted", className)}>
      <Icon icon={ImageIcon} size={24} />
    </div>
  );
}

/** Tela cheia: imagem ou ícone do tom em cima, texto e as duas ações embaixo. */
export function AnnouncementFullscreen({ tone, title, body, ctaLabel, hasImage, onCta, onDismiss, className }: AnnouncementContentProps) {
  const style = ANNOUNCEMENT_TONE_STYLES[tone];
  return (
    <div className={cn("flex h-full flex-col gap-3 bg-background px-5 pt-12 pb-6 text-fg", className)}>
      {hasImage ? (
        <ImageSlot className="min-h-32 flex-1" />
      ) : (
        <div className="grid min-h-32 flex-1 place-items-center rounded-xl bg-surface-3">
          <Icon icon={style.icon} size={44} className={style.text} />
        </div>
      )}
      <ToneLabel tone={tone} />
      <h2 className="m-0 text-2xl leading-tight font-bold tracking-tight text-pretty">{title}</h2>
      <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">{body}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {ctaLabel && (
          <Button size="tall" fullWidth onClick={onCta}>
            {ctaLabel}
          </Button>
        )}
        <Button variant="ghost" fullWidth onClick={onDismiss} className="text-fg-secondary">
          Agora não
        </Button>
      </div>
    </div>
  );
}

/** Modal centralizado (o fundo escurecido fica com quem posiciona). */
export function AnnouncementModalCard({ tone, title, body, ctaLabel, hasImage, onCta, onDismiss, className }: AnnouncementContentProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5 rounded-xl bg-surface-elevated p-5 text-fg shadow-e3", className)}>
      {hasImage && <ImageSlot className="h-28" />}
      <ToneLabel tone={tone} />
      <h2 className="m-0 text-lg leading-6 font-bold tracking-tight text-pretty">{title}</h2>
      <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">{body}</p>
      <div className="mt-1 flex flex-col gap-1.5">
        {ctaLabel && (
          <Button fullWidth onClick={onCta}>
            {ctaLabel}
          </Button>
        )}
        <Button variant="ghost" fullWidth onClick={onDismiss} className="text-fg-secondary">
          Agora não
        </Button>
      </div>
    </div>
  );
}

/** Faixa no topo da Início: dispensável no X. */
export function AnnouncementBannerCard({ tone, title, body, ctaLabel, onCta, onDismiss, className }: AnnouncementContentProps) {
  const style = ANNOUNCEMENT_TONE_STYLES[tone];
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-fg", style.tint, style.border, className)}>
      <Icon icon={style.icon} size={18} className={cn("mt-0.5 flex-none", style.text)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-sm leading-5">{title}</strong>
        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">{body}</span>
        {ctaLabel && (
          <button type="button" onClick={onCta} className="mt-0.5 cursor-pointer self-start text-[13px] font-semibold text-accent-text">
            {ctaLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={onDismiss}
        className="-m-2 grid size-11 flex-none cursor-pointer place-items-center rounded-md text-fg-muted hover:text-fg"
      >
        <Icon icon={X} size={16} />
      </button>
    </div>
  );
}

/** Toast como aparece na prévia do painel (no app, o comunicado usa a pilha de toasts do AppShell). */
export function AnnouncementToastCard({ tone, title, body, ctaLabel, className }: AnnouncementContentProps) {
  const style = ANNOUNCEMENT_TONE_STYLES[tone];
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-fg shadow-e3", className)}>
      <span className={cn("grid size-7 flex-none place-items-center rounded-sm", style.tint, style.text)}>
        <Icon icon={style.icon} size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="text-[13px] leading-4">{title}</strong>
        <span className="truncate text-xs leading-4 text-fg-secondary">{body}</span>
      </span>
      {ctaLabel && <span className="text-xs font-semibold whitespace-nowrap text-accent-text">{ctaLabel}</span>}
    </div>
  );
}
