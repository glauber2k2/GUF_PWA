"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  Ban,
  Bell,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleX,
  CornerDownRight,
  Download,
  Dumbbell,
  FileDiff,
  FileText,
  FolderLock,
  Globe,
  HeartOff,
  HeartPulse,
  LogIn,
  Ruler,
  Shield,
  Stethoscope,
  Target,
  ToggleLeft,
  Trash2,
  TriangleAlert,
  UserCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { LEGAL_ACTIONS, legalTextParts, type LegalAction, type LegalIcon, type LegalSummaryItem } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

export const LEGAL_ICONS: Record<LegalIcon, LucideIcon> = {
  "user-check": UserCheck,
  stethoscope: Stethoscope,
  "folder-lock": FolderLock,
  "circle-x": CircleX,
  bell: Bell,
  dumbbell: Dumbbell,
  ban: Ban,
  "heart-pulse": HeartPulse,
  download: Download,
  globe: Globe,
  ruler: Ruler,
  target: Target,
  "toggle-left": ToggleLeft,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  "file-text": FileText,
  shield: Shield,
};

const ACTION_ICONS: Record<LegalAction, LucideIcon> = { export: Download, delete: Trash2, revoke: HeartOff };

/** Texto com os marcadores de dado real ("[CNPJ]") destacados até o texto jurídico final entrar. */
export function LegalText({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <>
      {legalTextParts(text).map((part, i) =>
        part.placeholder ? (
          <span key={i} className={cn("rounded-[4px] bg-warning/14 px-1 font-semibold text-warning", small ? "text-[13px]" : "text-sm")}>
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/**
 * "Em resumo": 4 a 6 itens com ícone, sempre ANTES do texto completo (não o substitui).
 * Reutilizável no consentimento de saúde (resumo de 5 itens sempre visível).
 */
export function LegalSummary({ items, id = "lg-resumo", note = true, children }: { items: LegalSummaryItem[]; id?: string; note?: boolean; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface px-[18px] pt-[18px] pb-4 shadow-e1">
      <h2 id={id} className="m-0 text-lg leading-6 font-semibold tracking-[-0.01em]">
        Em resumo
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.text} className="flex items-start gap-3">
            <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-accent-tile text-accent-text">
              <Icon icon={LEGAL_ICONS[item.icon]} size={16} />
            </span>
            <span className="pt-[5px] text-[15px] leading-[22px] text-pretty">{item.text}</span>
          </li>
        ))}
      </ul>
      {children}
      {note && (
        <p className="m-0 border-t border-border pt-3 text-[13px] leading-[18px] text-pretty text-fg-muted">
          O resumo ajuda a entender, mas não substitui o texto completo abaixo.
        </p>
      )}
    </section>
  );
}

/** "O que mudou nesta versão" (quem aceitou uma versão anterior). */
export function LegalChanges({ items, title = "O que mudou nesta versão" }: { items: string[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-info/26 bg-legal-changes p-4">
      <h2 className="m-0 flex items-center gap-2 text-base leading-[22px] font-semibold">
        <Icon icon={FileDiff} size={18} className="text-info" />
        {title}
      </h2>
      <ChangeList items={items} />
    </section>
  );
}

export function ChangeList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-5">
          <Icon icon={ArrowRight} size={14} className="mt-[3px] text-info" />
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export type ActionAvailability = "ready" | "offline" | "visitor";

/**
 * Atalho dentro do texto (exportar, excluir conta, revogar): leva a Perfil › Privacidade.
 * Sem login ou sem internet fica indisponível e diz o porquê.
 */
export function LegalActionCard({ action, availability, onClick }: { action: LegalAction; availability: ActionAvailability; onClick: () => void }) {
  const info = LEGAL_ACTIONS[action];
  const blocked = availability !== "ready";
  const sub =
    availability === "offline"
      ? { icon: WifiOff, text: "Precisa de internet", className: "text-warning" }
      : availability === "visitor"
        ? { icon: LogIn, text: "Entre na sua conta para usar", className: "text-fg-muted" }
        : { icon: CornerDownRight, text: "Perfil › Privacidade", className: "text-fg-muted" };
  return (
    <button
      type="button"
      aria-disabled={blocked}
      onClick={blocked ? undefined : onClick}
      className={cn(
        "flex min-h-[76px] w-full items-center gap-3 rounded-lg border border-border-strong bg-surface py-3.5 pr-3 pl-3.5 text-left text-fg",
        blocked ? "cursor-default" : "cursor-pointer hover:bg-surface-elevated",
      )}
    >
      <span className={cn("grid size-10 flex-none place-items-center rounded-md", info.danger ? "bg-danger-tile text-danger" : "bg-empty-tile text-accent-text")}>
        <Icon icon={ACTION_ICONS[action]} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[15px] leading-[22px] font-semibold", info.danger && "text-danger")}>{info.title}</span>
        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">{info.description}</span>
        <span className={cn("flex items-center gap-1.5 text-xs leading-4", sub.className)}>
          <Icon icon={sub.icon} size={13} />
          {sub.text}
        </span>
      </span>
      <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
    </button>
  );
}

/** Linha de aceite abaixo do selo de versão. */
export function AcceptanceLine({ accepted, children }: { accepted: boolean; children: ReactNode }) {
  return (
    <p className={cn("m-0 flex items-center gap-2 text-sm leading-5", accepted ? "text-fg-secondary" : "text-fg-muted")}>
      <Icon icon={accepted ? CircleCheck : CircleDashed} size={16} className={accepted ? "text-success" : undefined} />
      {children}
    </p>
  );
}
