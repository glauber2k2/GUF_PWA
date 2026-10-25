"use client";

import type { AdminAnnouncementSummary } from "@guf/api/admin";
import { ANNOUNCEMENT_FORMATS, ANNOUNCEMENT_TONES } from "@guf/core";
import { ANNOUNCEMENT_TONE_STYLES, cn, Icon } from "@guf/ui";
import { audienceLabel, FORMAT_ICONS, formatPeriod, statValue } from "@/features/announcements/helpers/announcement-display";
import type { Device } from "@/shared/hooks/use-device";
import { LIST_ITEM_FOCUS, listItemProps } from "@/shared/helpers/list-navigation";

/** Nome da lista para os atalhos (↑/↓ e Enter). */
export const ANNOUNCEMENT_LIST = "announcements";

interface AnnouncementListProps {
  items: AdminAnnouncementSummary[];
  device: Device;
  planNames: Record<string, string>;
  onOpen: (item: AdminAnnouncementSummary) => void;
}

function ToneLabel({ item }: { item: AdminAnnouncementSummary }) {
  const style = ANNOUNCEMENT_TONE_STYLES[item.tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px] font-semibold", style.text)}>
      <Icon icon={style.icon} size={13} />
      {ANNOUNCEMENT_TONES[item.tone].label}
    </span>
  );
}

function FormatLabel({ item }: { item: AdminAnnouncementSummary }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-fg-secondary">
      <Icon icon={FORMAT_ICONS[item.format]} size={15} />
      {ANNOUNCEMENT_FORMATS[item.format].label}
    </span>
  );
}

const NUMBER = "font-display text-lg font-bold tabular-nums";

/** 7a–7c · Comunicados: cartões com os números no celular; tabela no tablet e no computador. */
export function AnnouncementList({ items, device, planNames, onOpen }: AnnouncementListProps) {
  if (device === "mobile") {
    return (
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full cursor-pointer flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 text-left active:scale-[.98]"
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <ToneLabel item={item} />
                <span className="text-fg-muted">·</span>
                <FormatLabel item={item} />
              </span>
              <strong className="text-base leading-[22px]">{item.title || "Sem título"}</strong>
              <span className="text-[13px] text-fg-secondary">
                {audienceLabel(item, planNames)} · {formatPeriod(item.startsAt, item.endsAt)}
              </span>
              <span className="grid grid-cols-3 gap-2 border-t border-border pt-2.5">
                {[
                  { label: "alcance", value: statValue(item, item.reachEstimate) },
                  { label: "vistos", value: statValue(item, item.seenCount) },
                  { label: "cliques", value: statValue(item, item.ctaCount) },
                ].map((stat) => (
                  <span key={stat.label} className="flex flex-col">
                    <span className="font-display text-[22px] leading-6 font-bold tabular-nums">{stat.value}</span>
                    <span className="text-xs text-fg-muted">{stat.label}</span>
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const isDesktop = device === "desktop";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-surface-elevated text-overline tracking-[.08em] text-fg-muted uppercase">
            <th scope="col" className="h-11 border-b border-border px-4 text-left font-semibold">Comunicado</th>
            <th scope="col" className="border-b border-border px-4 text-left font-semibold">Formato</th>
            {isDesktop && <th scope="col" className="border-b border-border px-4 text-left font-semibold">Público</th>}
            <th scope="col" className="border-b border-border px-4 text-left font-semibold">Período</th>
            <th scope="col" className="border-b border-border px-4 text-right font-semibold">Alcance</th>
            {isDesktop && <th scope="col" className="border-b border-border px-4 text-right font-semibold">Vistos</th>}
            {isDesktop && <th scope="col" className="border-b border-border px-4 text-right font-semibold">Cliques</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              {...listItemProps(ANNOUNCEMENT_LIST, item.id)}
              aria-label={item.title || "Sem título"}
              onClick={() => onOpen(item)}
              className={cn("cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-elevated", LIST_ITEM_FOCUS)}
            >
              <td className="px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(item);
                    }}
                    className="cursor-pointer text-left font-semibold"
                  >
                    {item.title || "Sem título"}
                  </button>
                  <ToneLabel item={item} />
                </span>
              </td>
              <td className="px-4 py-3">
                <FormatLabel item={item} />
              </td>
              {isDesktop && <td className="max-w-[260px] px-4 py-3 text-fg-secondary">{audienceLabel(item, planNames)}</td>}
              <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{formatPeriod(item.startsAt, item.endsAt)}</td>
              <td className={cn("px-4 py-3 text-right", NUMBER)}>{statValue(item, item.reachEstimate)}</td>
              {isDesktop && <td className={cn("px-4 py-3 text-right", NUMBER)}>{statValue(item, item.seenCount)}</td>}
              {isDesktop && <td className={cn("px-4 py-3 text-right", NUMBER)}>{statValue(item, item.ctaCount)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
