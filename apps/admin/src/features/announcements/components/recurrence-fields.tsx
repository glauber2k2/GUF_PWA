"use client";

import { CalendarRange, Repeat } from "lucide-react";
import {
  countOccurrencesUntil,
  RECURRENCE_EVERY_MAX,
  RECURRENCE_EVERY_MIN,
  recurrenceEveryLabel,
  recurrenceSummary,
  recurrenceWindowOptions,
  upcomingOccurrences,
  type AnnouncementRecurrence,
} from "@guf/core";
import { Chip, Icon, SegmentedControl, Stepper, TextField } from "@guf/ui";
import { formatOccurrence } from "@/features/announcements/helpers/announcement-display";
import {
  firstStart,
  REPEAT_COUNT_MAX,
  type EditorState,
  type RepeatEndMode,
} from "@/features/announcements/helpers/editor-state";

/** Quantas próximas vezes a prévia lista. */
const PREVIEW_OCCURRENCES = 4;

const END_OPTIONS: Array<{ value: RepeatEndMode; label: string }> = [
  { value: "never", label: "Nunca" },
  { value: "date", label: "Na data" },
  { value: "count", label: "Após N vezes" },
];

function toRepeatEnd(value: string): RepeatEndMode {
  return value === "date" || value === "count" ? value : "never";
}

interface RecurrenceFieldsProps {
  state: EditorState;
  recurrence: AnnouncementRecurrence;
  endsAt: string | null;
  onChange: (patch: Partial<EditorState>) => void;
}

/**
 * Repetição do comunicado: intervalo ("a cada N"), quanto tempo cada vez fica no app, quando
 * termina e, ao vivo, o resumo e as próximas vezes (horário de Brasília).
 */
export function RecurrenceFields({ state, recurrence, endsAt, onChange }: RecurrenceFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <Stepper
            label="Intervalo"
            value={recurrence.every}
            min={RECURRENCE_EVERY_MIN}
            max={RECURRENCE_EVERY_MAX}
            onChange={(every) => onChange({ repeatEvery: every })}
            decreaseLabel="Diminuir o intervalo"
            increaseLabel="Aumentar o intervalo"
          />
          <span className="text-[13px] text-fg-secondary">{recurrenceEveryLabel(recurrence.unit, recurrence.every)}</span>
        </div>
        <WindowField recurrence={recurrence} onChange={(windowHours) => onChange({ windowHours })} />
      </div>
      <EndField state={state} onChange={onChange} />
      <RecurrencePreview state={state} recurrence={recurrence} endsAt={endsAt} />
    </>
  );
}

function WindowField({ recurrence, onChange }: { recurrence: AnnouncementRecurrence; onChange: (hours: number) => void }) {
  return (
    <div role="group" aria-labelledby="recurrence-window-label" className="flex flex-col gap-2">
      <span id="recurrence-window-label" className="text-[11px] font-semibold tracking-[0.08em] text-fg-muted uppercase">
        Cada vez fica no app por
      </span>
      <div className="flex flex-wrap gap-2">
        {recurrenceWindowOptions(recurrence.unit, recurrence.every).map((option) => (
          <Chip
            key={option.hours}
            label={option.label}
            selected={recurrence.windowHours === option.hours}
            onChange={() => onChange(option.hours)}
          />
        ))}
      </div>
      <span className="text-[13px] text-fg-muted">Depois disso, some até a próxima vez.</span>
    </div>
  );
}

function EndField({ state, onChange }: { state: EditorState; onChange: (patch: Partial<EditorState>) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-fg-secondary">Termina</span>
      <SegmentedControl
        label="Quando a repetição termina"
        options={END_OPTIONS}
        value={state.repeatEnd}
        onChange={(value) => onChange({ repeatEnd: toRepeatEnd(value) })}
      />
      {state.repeatEnd === "date" && (
        <div className="max-w-[260px]">
          <TextField label="Último dia" type="date" value={state.endDate} hint="Vale até 23:59 desse dia." onChange={(e) => onChange({ endDate: e.target.value })} />
        </div>
      )}
      {state.repeatEnd === "count" && (
        <div className="max-w-[260px]">
          <Stepper
            label="Vezes"
            value={state.repeatCount}
            min={1}
            max={REPEAT_COUNT_MAX}
            onChange={(repeatCount) => onChange({ repeatCount })}
            decreaseLabel="Uma vez a menos"
            increaseLabel="Uma vez a mais"
          />
        </div>
      )}
      {state.repeatEnd === "never" && (
        <span className="text-[13px] text-fg-muted">Repete até alguém encerrar o comunicado na lista.</span>
      )}
    </div>
  );
}

/** Resumo e próximas vezes, para conferir antes de publicar. */
function RecurrencePreview({ state, recurrence, endsAt }: { state: EditorState; recurrence: AnnouncementRecurrence; endsAt: string | null }) {
  const start = firstStart(state);
  const end = endsAt ? new Date(endsAt) : null;
  const upcoming = upcomingOccurrences(start, recurrence, new Date(), PREVIEW_OCCURRENCES, end);
  const total = end ? countOccurrencesUntil(start, recurrence, end) : null;
  return (
    <section aria-label="Prévia da repetição" aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 flex-none place-items-center rounded-md bg-accent/14 text-accent-text">
          <Icon icon={Repeat} size={16} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <strong className="text-sm leading-5 text-pretty">{recurrenceSummary(start, recurrence)}</strong>
          <span className="text-[13px] text-fg-secondary">
            {total === null ? "Sem data para terminar." : total === 0 ? "Nenhuma vez antes do fim: confira as datas." : `${total} ${total === 1 ? "vez" : "vezes"} no total.`}
          </span>
        </div>
      </div>
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-fg-muted uppercase">
            <Icon icon={CalendarRange} size={13} />
            Próximas vezes
          </span>
          <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
            {upcoming.map((occurrence) => (
              <li key={occurrence.toISOString()} className="rounded-pill bg-surface-3 px-3 py-1 text-[13px] text-fg tabular-nums">
                {formatOccurrence(occurrence)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {state.startMode === "now" && (
        <span className="text-[13px] text-fg-muted">
          Com &quot;Ao publicar&quot;, a 1ª vez começa na hora da publicação, e o dia e o horário das próximas vêm dela.
        </span>
      )}
    </section>
  );
}
