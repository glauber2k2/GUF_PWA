"use client";

import { Clock } from "lucide-react";
import type { AnnouncementDraft } from "@guf/api/admin";
import { ANNOUNCEMENT_FREQUENCIES, ANNOUNCEMENT_PRIORITIES, priorityFromValue, type AnnouncementFrequency, type AnnouncementPriority } from "@guf/core";
import { Icon, SegmentedControl, TextField } from "@guf/ui";
import type { EditorState, StartMode } from "@/features/announcements/helpers/editor-state";
import { ChoiceCard } from "@/shared/components/choice-card";

interface ScheduleStepProps {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  onDraft: (patch: Partial<AnnouncementDraft>) => void;
}

const NOW_FORMAT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** 8e · c) Quando: começo (agora ou data), fim, frequência e prioridade, no horário de Brasília. */
export function ScheduleStep({ state, onChange, onDraft }: ScheduleStepProps) {
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-fg-secondary">Começar</span>
        <SegmentedControl
          label="Começar"
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
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-fg-secondary">Terminar em</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          <TextField label="Data" type="date" value={state.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
          <TextField label="Hora" type="time" value={state.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </div>
      </div>
      <span className="flex items-center gap-2 rounded-md bg-surface-3 px-3 py-2.5 text-[13px] text-fg-secondary">
        <Icon icon={Clock} size={15} />
        Horário de Brasília (UTC−3). Agora: {NOW_FORMAT.format(new Date()).replace(".", "")}.
      </span>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[13px] font-semibold text-fg-secondary">Frequência</legend>
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
