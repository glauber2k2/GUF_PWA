import { CalendarDays, Dumbbell, House, User, BookOpen } from "lucide-react";
import type { AnnouncementDraft } from "@guf/api/admin";
import { AnnouncementBannerCard, AnnouncementFullscreen, AnnouncementModalCard, AnnouncementToastCard, Icon, StreakFlame } from "@guf/ui";

interface PhonePreviewProps {
  draft: AnnouncementDraft;
  theme: "dark" | "light";
}

const NAV_ICONS = [House, CalendarDays, Dumbbell, BookOpen, User];

/**
 * 8pa–8ph · Prévia do comunicado na Início do app guf, nos dois temas. Usa os MESMOS componentes
 * que o app desenha (packages/ui): o que se vê aqui é o que a pessoa vê.
 */
export function PhonePreview({ draft, theme }: PhonePreviewProps) {
  const content = {
    tone: draft.tone,
    title: draft.title || "Título do comunicado",
    body: draft.body || "Texto do comunicado.",
    ctaLabel: draft.ctaLabel,
  };
  return (
    <div role="img" aria-label={`Prévia no app guf: ${draft.format}`} className="w-[272px] flex-none rounded-[44px] bg-[#050607] p-2 shadow-e3">
      <div data-theme={theme} className="relative h-[544px] overflow-hidden rounded-[36px] bg-background text-fg">
        <div aria-hidden="true" className="pointer-events-none flex h-full flex-col">
          <div className="flex items-center justify-between px-4 pt-10 pb-2.5">
            <div className="flex flex-col">
              <span className="text-[11px] text-fg-muted">Qui, 22 out</span>
              <strong className="text-[19px] leading-6 tracking-[-0.02em]">Olá, Marina</strong>
            </div>
            <span className="grid size-8 place-items-center rounded-pill border border-border-strong text-[13px] font-semibold">M</span>
          </div>
          {draft.format === "banner" && <AnnouncementBannerCard {...content} className="mx-3 mb-2.5 [&_strong]:text-[12.5px]" />}
          <div className="flex flex-col gap-2.5 px-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
              <StreakFlame size={22} className="text-accent-text" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold tracking-[.08em] text-fg-muted uppercase">Sequência</span>
                <span className="font-display text-[22px] leading-6 font-bold tabular-nums">6 semanas</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3.5">
              <span className="text-[10px] font-semibold tracking-[.08em] text-fg-muted uppercase">Próxima</span>
              <strong className="text-sm">Treino A – Peito e Tríceps</strong>
              <span className="text-[11.5px] text-fg-secondary">6 exercícios · ~55 min</span>
              <span className="grid h-9.5 place-items-center rounded-md bg-accent text-[13px] font-semibold text-accent-foreground">Iniciar treino</span>
            </div>
          </div>
          <div className="flex-1" />
          {draft.format === "toast" && <AnnouncementToastCard {...content} className="mx-2.5 mb-2.5" />}
          <div className="flex h-16 items-center justify-around border-t border-border px-2 pb-1.5 text-fg-muted">
            {NAV_ICONS.map((icon, index) =>
              index === 2 ? (
                <span key={index} className="grid size-10 place-items-center rounded-pill bg-accent text-accent-foreground">
                  <Icon icon={icon} size={19} />
                </span>
              ) : (
                <Icon key={index} icon={icon} size={19} className={index === 0 ? "text-accent-text" : undefined} />
              ),
            )}
          </div>
        </div>
        {draft.format === "modal" && (
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-scrim p-4">
            <AnnouncementModalCard {...content} className="[&_h2]:text-[17px]" />
          </div>
        )}
        {draft.format === "fullscreen" && (
          <div aria-hidden="true" className="absolute inset-0">
            <AnnouncementFullscreen {...content} />
          </div>
        )}
      </div>
    </div>
  );
}
