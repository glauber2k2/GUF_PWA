"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, FileDiff, FileText, List, PencilRuler } from "lucide-react";
import {
  formatDayMonthYear,
  LEGAL_COMPANY_LINE,
  LEGAL_CONTENT_IS_DRAFT,
  LEGAL_DOCUMENTS,
  LEGAL_DPO_LINE,
  LEGAL_READER_ORDER,
  legalAcceptance,
  type LegalAction,
  type LegalBlock,
  type LegalReaderDoc,
  type LegalSection,
} from "@guf/core";
import { Banner, BottomSheet, Icon, IconButton } from "@/shared/components/ds";
import { useLegalOverview } from "@/features/legal/api/use-legal";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { cn } from "@/shared/helpers/class-names";
import { useAuth } from "@/features/auth";
import { AcceptanceLine, ChangeList, LEGAL_ICONS, LegalActionCard, LegalSummary, LegalText, type ActionAvailability } from "./legal-ui";

/** O cabeçalho ganha fundo, divisória e título depois de rolar isto (px). */
const SCROLLED_AT = 72;
/** Espaço acima da seção ao rolar até ela (cabeçalho compacto). */
const SCROLL_OFFSET = 64;

export interface LegalReaderProps {
  doc: LegalReaderDoc;
  /** Seção para abrir já rolada e destacada (ex.: "idade"). */
  anchor?: string;
  backLabel: string;
  onBack: () => void;
  /** Abrir outro documento (links no texto e "Outros documentos"). */
  onOpenDoc: (doc: LegalReaderDoc, anchor?: string) => void;
  /** Atalho do texto (exportar, excluir, revogar) → Perfil › Privacidade. */
  onAction: (action: LegalAction) => void;
  className?: string;
}

/**
 * Leitor único dos documentos legais. Funciona sem login (texto do app) e sem internet
 * (só versão e aceite dependem do banco). Ordem: selo de versão → "Em resumo" → sumário → texto.
 */
export function LegalReader({ doc, anchor, backLabel, onBack, onOpenDoc, onAction, className }: LegalReaderProps) {
  const content = LEGAL_DOCUMENTS[doc];
  const { user } = useAuth();
  const online = useOnlineStatus();
  const overview = useLegalOverview();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocSheet, setTocSheet] = useState(false);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);

  const current = overview.data?.current[content.docType] ?? null;
  const accepted = overview.data?.accepted?.[content.docType] ?? null;
  const loggedIn = Boolean(user) && Boolean(overview.data?.accepted);
  const acceptance = loggedIn ? legalAcceptance(current?.version ?? null, accepted?.version ?? null) : null;
  const changes = current ? (content.changes[current.version] ?? []) : [];
  const availability: ActionAvailability = !online ? "offline" : !user ? "visitor" : "ready";
  const isHealth = content.docType === "health_consent";

  const scrollTo = useCallback((id: string, highlight: boolean, instant = false) => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-sec="${id}"]`);
    if (!container || !el) return;
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - SCROLL_OFFSET;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({ top: Math.max(0, top), behavior: instant || reduced ? "auto" : "smooth" });
    if (highlight) setFlash((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  }, []);

  // Aberto por um link com seção (ex.: /termos#idade): rola até ela e destaca.
  useEffect(() => {
    if (!anchor) return;
    const timer = setTimeout(() => scrollTo(anchor, true, true), 120);
    return () => clearTimeout(timer);
  }, [anchor, doc, scrollTo]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop > SCROLLED_AT;
    if (next !== scrolled) setScrolled(next);
  };

  const renderBlock = (block: LegalBlock, key: number) => {
    switch (block.kind) {
      case "p":
        return (
          <p key={key} className="m-0 text-base leading-[26px] text-pretty">
            <LegalText text={block.text} />
          </p>
        );
      case "h3":
        return (
          <h3 key={key} className="m-0 mt-1 text-base leading-6 font-semibold">
            {block.text}
          </h3>
        );
      case "ul":
        return (
          <ul key={key} className="m-0 flex list-none flex-col gap-2 p-0">
            {block.items.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-[26px]">
                <span aria-hidden className="mt-2.5 size-1.5 flex-none rounded-[3px] bg-fg-muted" />
                <span className="text-pretty">
                  <LegalText text={item} />
                </span>
              </li>
            ))}
          </ul>
        );
      case "table":
        // Tabela empilhada: cada linha vira um bloco (cabe em 390 px sem rolagem lateral).
        return (
          <div key={key} role="table" aria-label={block.caption} className="overflow-hidden rounded-md border border-border">
            <div role="row" className="flex gap-2 bg-surface-3 px-3.5 py-2 text-[11px] font-semibold tracking-[0.08em] text-fg-secondary uppercase">
              {block.head.map((h) => (
                <span key={h} role="columnheader">
                  {h}
                </span>
              ))}
            </div>
            {block.rows.map((row) => (
              <div key={row[0]} role="row" className="flex flex-col gap-1 border-t border-border px-3.5 py-3">
                <span role="cell" className="text-[15px] leading-[22px] font-semibold">
                  {row[0]}
                </span>
                {row.slice(1).map((value, i) => (
                  <span key={i} role="cell" className="text-sm leading-5 text-pretty text-fg-secondary">
                    <span className="text-fg-muted">{block.head[i + 1]}: </span>
                    <LegalText text={value} small />
                  </span>
                ))}
              </div>
            ))}
          </div>
        );
      case "note":
        return (
          <div key={key} role="note" className="flex gap-3 rounded-[14px] border border-warning/28 bg-legal-note px-4 py-3.5">
            <Icon icon={LEGAL_ICONS[block.icon]} size={20} className="mt-0.5 text-warning" />
            <span className="text-[15px] leading-6 font-medium text-pretty">{block.text}</span>
          </div>
        );
      case "link":
        return (
          <a
            key={key}
            href={LEGAL_DOCUMENTS[block.doc].route + (block.anchor ? `#${block.anchor}` : "")}
            onClick={(e) => {
              e.preventDefault();
              onOpenDoc(block.doc, block.anchor);
            }}
            className="flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-accent-text underline underline-offset-[3px]"
          >
            <Icon icon={FileText} size={16} />
            {block.text}
          </a>
        );
      case "action":
        return <LegalActionCard key={key} action={block.action} availability={availability} onClick={() => onAction(block.action)} />;
    }
  };

  return (
    <div ref={scrollRef} onScroll={onScroll} className={cn("fixed inset-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-background text-fg", className)}>
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col">
        <header
          className={cn(
            "sticky top-0 z-[5] flex h-[calc(52px+env(safe-area-inset-top))] items-center gap-1 border-b px-1 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200 ease-standard",
            scrolled ? "border-border bg-background/90 backdrop-blur-[12px]" : "border-transparent bg-background",
          )}
        >
          <IconButton icon={ChevronLeft} label={backLabel} variant="ghost" onClick={onBack} />
          <span
            aria-hidden={!scrolled}
            className={cn("min-w-0 flex-1 truncate text-base leading-[22px] font-semibold transition-opacity duration-200 ease-standard", scrolled ? "opacity-100" : "opacity-0")}
          >
            {content.shortTitle}
          </span>
          <IconButton icon={List} label="Sumário do documento" variant="ghost" onClick={() => setTocSheet(true)} />
        </header>

        <article className="flex flex-col gap-5 px-5 pt-2">
          <div className="flex flex-col gap-3">
            {LEGAL_CONTENT_IS_DRAFT && (
              <span className="flex h-6 items-center gap-1.5 self-start rounded-sm bg-warning/14 px-2 text-xs font-semibold text-warning">
                <Icon icon={PencilRuler} size={13} />
                Rascunho · texto fictício
              </span>
            )}
            <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-balance">{content.title}</h1>
            {current && (
              <div className="flex min-h-7 flex-wrap items-center gap-1.5 self-start rounded-pill bg-surface-3 px-3 text-[13px] leading-[18px] text-fg-secondary">
                <span className="font-display text-[15px] font-semibold text-fg tabular-nums">Versão {current.version}</span>
                <span aria-hidden>·</span>
                <span>Em vigor desde {formatDayMonthYear(new Date(current.publishedAt))}</span>
              </div>
            )}
            {acceptance === "accepted" && accepted && (
              <AcceptanceLine accepted>
                {isHealth ? "Você autorizou este termo em " : "Você aceitou esta versão em "}
                {formatDayMonthYear(new Date(accepted.acceptedAt))}
              </AcceptanceLine>
            )}
            {acceptance === "not_accepted" && (
              <AcceptanceLine accepted={false}>{isHealth ? "Você ainda não autorizou este termo" : "Você ainda não aceitou este documento"}</AcceptanceLine>
            )}
          </div>

          {!online && (
            <Banner tone="warning" title="Sem conexão">
              o documento continua disponível no aparelho. Atalhos que precisam de internet ficam indisponíveis.
            </Banner>
          )}

          {acceptance === "outdated" && accepted && (
            <div className="flex flex-col gap-3 rounded-lg border border-info/30 bg-legal-changes p-4">
              <div className="flex items-start gap-2.5">
                <Icon icon={FileDiff} size={20} className="mt-px text-info" />
                <div className="flex flex-col gap-0.5">
                  <strong className="text-[15px] leading-[22px]">Há uma versão mais nova deste documento</strong>
                  <span className="text-sm leading-5 text-fg-secondary">
                    Você aceitou a versão {accepted.version} em {formatDayMonthYear(new Date(accepted.acceptedAt))}.
                  </span>
                </div>
              </div>
              {changes.length > 0 && (
                <>
                  <div className="text-[11px] font-semibold tracking-[0.08em] text-fg-muted uppercase">O que mudou nesta versão</div>
                  <ChangeList items={changes} />
                </>
              )}
            </div>
          )}

          <LegalSummary items={content.summary} />

          <nav aria-label="Nesta página" className="overflow-hidden rounded-lg border border-border bg-surface">
            <button
              type="button"
              aria-expanded={tocOpen}
              onClick={() => setTocOpen((v) => !v)}
              className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 bg-transparent pr-3.5 pl-4 text-fg"
            >
              <Icon icon={List} size={18} className="text-fg-secondary" />
              <span className="flex-1 text-left text-[15px] font-semibold">Nesta página</span>
              <span className="text-[13px] text-fg-muted">{content.sections.length} seções</span>
              <Icon icon={ChevronDown} size={18} className={cn("text-fg-muted transition-transform duration-200 ease-standard", tocOpen && "rotate-180")} />
            </button>
            {tocOpen && (
              <div className="border-t border-border px-1.5 pt-1 pb-2">
                <TocList sections={content.sections} onPick={(id) => scrollTo(id, true)} itemClass="min-h-11 rounded-[10px] px-2.5" />
              </div>
            )}
          </nav>

          <div className="flex max-w-[68ch] flex-col gap-3">
            {content.sections.map((s, i) => (
              <section
                key={`${s.id}-${flash?.id === s.id ? flash.n : 0}`}
                id={s.id}
                data-sec={s.id}
                aria-labelledby={`h-${s.id}`}
                className={cn(
                  "-mx-3 flex scroll-mt-16 flex-col gap-3 rounded-md p-3",
                  flash?.id === s.id && (flash.n % 2 ? "animate-guf-legal-flash-a" : "animate-guf-legal-flash-b"),
                )}
              >
                <h2 id={`h-${s.id}`} className="m-0 text-xl leading-7 font-semibold tracking-[-0.01em] text-balance">
                  {i + 1}. {s.title}
                </h2>
                {s.blocks.map(renderBlock)}
              </section>
            ))}
          </div>

          <footer className="flex flex-col gap-5 border-t border-border pt-6 pb-[calc(48px+env(safe-area-inset-bottom))]">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 mb-1 text-[15px] leading-[22px] font-semibold">Outros documentos</h2>
              {LEGAL_READER_ORDER.filter((d) => d !== doc).map((d) => {
                const other = LEGAL_DOCUMENTS[d];
                return (
                  <a
                    key={d}
                    href={other.route}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenDoc(d);
                    }}
                    className="flex min-h-12 items-center gap-3 border-b border-border px-1 text-[15px] text-fg no-underline"
                  >
                    <Icon icon={LEGAL_ICONS[other.icon]} size={18} className="text-fg-secondary" />
                    <span className="flex-1">{other.title}</span>
                    <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
                  </a>
                );
              })}
            </div>
            <div className="flex flex-col gap-1.5 text-sm leading-5 text-fg-secondary">
              <h2 className="m-0 text-[15px] leading-[22px] font-semibold text-fg">Contato sobre seus dados</h2>
              <span>
                <LegalText text={LEGAL_DPO_LINE} small />
              </span>
              <span>
                <LegalText text={LEGAL_COMPANY_LINE} small />
              </span>
              {current && (
                <span className="text-fg-muted">
                  {content.title} · versão {current.version} · em vigor desde {formatDayMonthYear(new Date(current.publishedAt))}
                </span>
              )}
            </div>
          </footer>
        </article>
      </div>

      <BottomSheet placement="screen" open={tocSheet} onClose={() => setTocSheet(false)} title="Nesta página" subtitle={`${content.sections.length} seções`}>
        <div className="max-h-[440px] overflow-y-auto">
          <TocList
            sections={content.sections}
            onPick={(id) => {
              setTocSheet(false);
              setTimeout(() => scrollTo(id, true), 220);
            }}
            itemClass="min-h-12 rounded-md px-2"
          />
        </div>
      </BottomSheet>
    </div>
  );
}

/** Lista numerada das seções (sumário recolhível e folha "Nesta página"); alvos de 44 px ou mais. */
function TocList({ sections, onPick, itemClass }: { sections: LegalSection[]; onPick: (id: string) => void; itemClass: string }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              onPick(s.id);
            }}
            className={cn("flex items-center gap-2.5 text-[15px] leading-5 text-fg no-underline hover:bg-surface-3", itemClass)}
          >
            <span className="w-5 flex-none font-display text-base font-semibold text-fg-muted tabular-nums">{i + 1}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
