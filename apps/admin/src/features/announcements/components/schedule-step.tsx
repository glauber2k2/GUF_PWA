"use client";

import { Clock } from "lucide-react";
import type { AnnouncementDraft } from "@guf/api/admin";
import {
  ANNOUNCEMENT_FREQUENCIES,
  ANNOUNCEMENT_PRIORITIES,
  priorityFromValue,
  RECURRENCE_UNIT_ORDER,
  RECURRENCE_UNITS,
  type AnnouncementFrequency,
  type AnnouncementPriority,
} from "@guf/core";
import { Icon, SegmentedControl, TextField } from "@guf/ui";
import { recurrenceFromState, type EditorState, type RepeatMode, type StartMode } from "@/features/announcements/helpers/editor-state";
import { RecurrenceFields } from "@/features/announcements/components/recurrence-fields";
import { ChoiceCard } from "@/shared/components/choice-card";

interface ScheduleStepProps {
  state: EditorState;
  /** Fim já calculado (recorrente: data, N vezes ou nenhum). */
  endsAt: string | null;
  onChange: (patch: Partial<EditorState>) => void;
  onDraft: (patch: Partial<AnnouncementDraft>) => void;
}

const NOW_FORMAT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const REPEAT_OPTIONS: Array<{ value: RepeatMode; label: string }> = [
  { value: "none", label: "Nunca" },
  ...RECURRENCE_UNIT_ORDER.map((unit) => ({ value: unit, label: RECURRENCE_UNITS[unit].option })),
];

function toRepeatMode(value: string): RepeatMode {
  return RECURRENCE_UNIT_ORDER.find((unit) => unit === value) ?? "none";
}

/**
 * 8e · c) Quando: repetição (não repete, diário, semanal, mensal, anual), começo, fim, frequência
 * e prioridade, no horário de Brasília.
 */
export function ScheduleStep({ state, endsAt, onChange, onDraft }: ScheduleStepProps) {
  const recurrence = recurrenceFromState(state);
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-fg-secondary">Repetir</span>
        <SegmentedControl label="Repetir" shape="rounded" options={REPEAT_OPTIONS} value={state.repeat} onChange={(value) => onChange({ repeat: toRepeatMode(value) })} />
        <span className="text-[13px] text-fg-muted">
          {recurrence ? "O dia da semana, o dia do mês e o horário vêm da primeira vez." : "Aparece uma vez, entre o começo e o fim."}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-fg-secondary">{recurrence ? "Primeira vez" : "Começar"}</span>
        <SegmentedControl
          label={recurrence ? "Primeira vez" : "Começar"}
          options={[
            { value: "now", label: "Ao publicar" },
            { value: "later", label: "Data e hora" },
          ]}
          value={state.startMode}
          onChange={(mode) => onChange({ startMode: mode as StartMode })}
        />
        {state.startMode === "later" && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <TextField label="Data" type="date" value={state.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
            <TextField label="Hora" type="time" value={state.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
          </div>
        )}
      </div>
      {recurrence ? (
        <RecurrenceFields state={state} recurrence={recurrence} endsAt={endsAt} onChange={onChange} />
      ) : (
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-semibold text-fg-secondary">Terminar em</span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <TextField label="Data" type="date" value={state.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
            <TextField label="Hora" type="time" value={state.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
          </div>
        </div>
      )}
      <span className="flex items-center gap-2 rounded-md bg-surface-3 px-3 py-2.5 text-[13px] text-fg-secondary">
        <Icon icon={Clock} size={15} />
        Horário de Brasília (UTC−3). Agora: {NOW_FORMAT.format(new Date()).replace(".", "")}.
      </span>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[13px] font-semibold text-fg-secondary">{recurrence ? "Em cada vez" : "Frequência"}</legend>
        <div role="radiogroup" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
          {(Object.keys(ANNOUNCEMENT_FREQUENCIES) as AnnouncementFrequency[]).map((frequency) => (
            <ChoiceCard
              key={frequency}
              selected={state.draft.frequency === frequency}
              onSelect={() => onDraft({ frequency })}
              title={ANNOUNCEMENT_FREQUENCIES[frequency].label}
              description={ANNOUNCEMENT_FREQUENCIES[frequency].description}
            />
          ))}
        </div>
        {recurrence && <span className="mt-2 block text-[13px] text-fg-muted">Na próxima vez, o comunicado aparece de novo para todos do público.</span>}
      </fieldset>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-fg-secondary">Prioridade</span>
        <SegmentedControl
          label="Prioridade"
          options={(Object.keys(ANNOUNCEMENT_PRIORITIES) as AnnouncementPriority[]).map((p) => ({ value: p, label: ANNOUNCEMENT_PRIORITIES[p].label }))}
          value={priorityFromValue(state.draft.priority)}
          onChange={(p) => onDraft({ priority: ANNOUNCEMENT_PRIORITIES[p as AnnouncementPriority].value })}
        />
        <span className="text-[13px] text-fg-muted">Se houver mais de um comunicado no mesmo momento, o de prioridade maior aparece primeiro.</span>
      </div>
    </>
  );
}
