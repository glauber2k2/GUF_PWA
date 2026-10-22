"use client";

import { CircleCheck } from "lucide-react";
import { cn, Icon } from "@guf/ui";
import { EDITOR_STEPS, type EditorStep } from "@/features/announcements/helpers/editor-state";

/** Passos do editor: no tablet/computador clicáveis; no celular, barra + "Passo 2 de 4 · Público". */
export function StepProgress({ step, onStep }: { step: EditorStep; onStep: (step: EditorStep) => void }) {
  const current = EDITOR_STEPS.find((s) => s.step === step);
  return (
    <>
      <ol aria-label="Passos" className="m-0 hidden list-none grid-cols-4 gap-2 p-0 md:grid">
        {EDITOR_STEPS.map((s) => (
          <li key={s.step}>
            <button
              type="button"
              onClick={() => onStep(s.step)}
              aria-current={s.step === step ? "step" : undefined}
              className="flex w-full cursor-pointer flex-col gap-2 text-left"
            >
              <span className={cn("h-1 rounded-pill", s.step <= step ? "bg-accent-text" : "bg-surface-3")} />
              <span
                className={cn(
                  "flex min-h-7 items-center gap-2 text-[13px] font-semibold",
                  s.step === step ? "text-fg" : s.step < step ? "text-fg-secondary" : "text-fg-muted",
                )}
              >
                {s.step < step ? <Icon icon={CircleCheck} size={16} className="text-accent-text" /> : <span className="font-display text-base">{s.step}</span>}
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 md:hidden">
        <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-label="Progresso" className="grid grid-cols-4 gap-1.5">
          {EDITOR_STEPS.map((s) => (
            <span key={s.step} className={cn("h-1 rounded-pill", s.step <= step ? "bg-accent-text" : "bg-surface-3")} />
          ))}
        </div>
        <span className="text-[13px] font-semibold text-fg-secondary">
          Passo {step} de 4 · {current?.label}
        </span>
      </div>
    </>
  );
}
