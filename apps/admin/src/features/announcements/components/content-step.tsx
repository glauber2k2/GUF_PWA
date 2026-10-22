"use client";

import { ImageOff } from "lucide-react";
import type { AnnouncementDraft } from "@guf/api/admin";
import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_FORMATS,
  ANNOUNCEMENT_LIMITS,
  ANNOUNCEMENT_TONES,
  type AnnouncementFormat,
  type AnnouncementTone,
} from "@guf/core";
import { ANNOUNCEMENT_TONE_STYLES, cn, Icon, Switch, TextAreaField, TextField } from "@guf/ui";
import { FORMAT_ICONS } from "@/features/announcements/helpers/announcement-display";

interface ContentStepProps {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}

/** Miniatura do formato (tela do celular com o aviso no lugar). */
function FormatThumb({ format }: { format: AnnouncementFormat }) {
  return (
    <span aria-hidden="true" className="relative h-19 w-11.5 overflow-hidden rounded-[9px] border-2 border-border-strong bg-background">
      <span className="absolute inset-x-1.5 top-3.5 h-1.5 rounded-[3px] bg-surface-3" />
      <span className="absolute inset-x-1.5 top-6 h-4 rounded-[4px] bg-surface-3" />
      {format === "fullscreen" && (
        <span className="absolute inset-0 flex flex-col justify-end gap-[3px] bg-surface-elevated p-1.5">
          <span className="mb-[3px] flex-1 rounded-[3px] bg-surface-3" />
          <span className="h-[3px] w-[70%] rounded-[2px] bg-fg-secondary" />
          <span className="h-1.5 rounded-[2px] bg-accent" />
        </span>
      )}
      {format === "modal" && (
        <span className="absolute inset-0 grid place-items-center bg-scrim">
          <span className="flex h-7.5 w-8 flex-col justify-end rounded-[5px] bg-surface-elevated p-[3px]">
            <span className="h-1.5 rounded-[2px] bg-accent" />
          </span>
        </span>
      )}
      {format === "toast" && <span className="absolute inset-x-1 bottom-1.5 h-2.5 rounded-[3px] bg-fg-secondary" />}
      {format === "banner" && <span className="absolute inset-x-1 top-1.5 h-2 rounded-[2px] bg-info" />}
    </span>
  );
}

/** 8a–8b · a) Conteúdo: formato, tom, título, texto e botão (com a tela que abre). */
export function ContentStep({ draft, onChange }: ContentStepProps) {
  const hasCta = draft.ctaLabel !== null;
  return (
    <>
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[13px] font-semibold text-fg-secondary">Formato</legend>
        <div role="radiogroup" aria-label="Formato" className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2.5">
          {(Object.keys(ANNOUNCEMENT_FORMATS) as AnnouncementFormat[]).map((format) => {
            const selected = draft.format === format;
            return (
              <button
                key={format}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ format })}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2.5 rounded-lg border-[1.5px] px-2.5 pt-3.5 pb-3 active:scale-[.97]",
                  selected ? "border-accent-text bg-accent/10" : "border-border-strong",
                )}
              >
                <FormatThumb format={format} />
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon icon={FORMAT_ICONS[format]} size={15} className="text-fg-secondary" />
                  {ANNOUNCEMENT_FORMATS[format].label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[13px] font-semibold text-fg-secondary">Tom</legend>
        <div role="radiogroup" aria-label="Tom" className="flex flex-wrap gap-2">
          {(Object.keys(ANNOUNCEMENT_TONES) as AnnouncementTone[]).map((tone) => {
            const selected = draft.tone === tone;
            const style = ANNOUNCEMENT_TONE_STYLES[tone];
            return (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ tone })}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border-[1.5px] px-3.5 font-semibold",
                  selected ? "border-accent-text bg-accent/10" : "border-border-strong",
                )}
              >
                <Icon icon={style.icon} size={16} className={style.text} />
                {ANNOUNCEMENT_TONES[tone].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TextField
        label="Título"
        value={draft.title}
        maxLength={ANNOUNCEMENT_LIMITS.title}
        onChange={(e) => onChange({ title: e.target.value })}
        hint={`${draft.title.length}/${ANNOUNCEMENT_LIMITS.title}`}
      />
      <TextAreaField
        label="Texto"
        rows={3}
        value={draft.body}
        maxLength={ANNOUNCEMENT_LIMITS.body}
        onChange={(e) => onChange({ body: e.target.value })}
        hint={`${draft.body.length}/${ANNOUNCEMENT_LIMITS.body}`}
      />

      <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4">
        <Switch
          label="Botão"
          checked={hasCta}
          onChange={(on) => onChange(on ? { ctaLabel: "Ver", ctaPath: "/" } : { ctaLabel: null, ctaPath: null })}
        />
        {hasCta && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-start gap-3.5">
            <TextField
              label="Rótulo do botão"
              value={draft.ctaLabel ?? ""}
              maxLength={ANNOUNCEMENT_LIMITS.ctaLabel}
              onChange={(e) => onChange({ ctaLabel: e.target.value })}
              hint="Verbo curto, como “Experimentar”."
            />
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-fg-secondary">Abre a tela</span>
              <select
                value={draft.ctaPath ?? "/"}
                onChange={(e) => onChange({ ctaPath: e.target.value })}
                className="h-12 cursor-pointer rounded-md border border-border-strong bg-surface-3 px-3.5 text-[15px] text-fg"
              >
                {ANNOUNCEMENT_DESTINATIONS.map((d) => (
                  <option key={d.path} value={d.path}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <p className="m-0 flex items-start gap-2 text-[13px] text-fg-muted">
        <Icon icon={ImageOff} size={15} className="mt-0.5 flex-none" />
        Imagem nos comunicados chega numa próxima versão (precisa do armazenamento de arquivos).
      </p>
    </>
  );
}
