"use client";

import { Check } from "lucide-react";
import { saveChangesLabel } from "@guf/core";
import { Button } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

export interface EditProfileSaveBarProps {
  /** Aparece só com alterações (ou enquanto salva). */
  visible: boolean;
  changes: number;
  saving: boolean;
  canSave: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** Barra fixa no rodapé (zona do polegar): Descartar · "Salvar N alterações". Sobe quando há o que salvar. */
export function EditProfileSaveBar({ visible, changes, saving, canSave, onDiscard, onSave }: EditProfileSaveBarProps) {
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/92 backdrop-blur-[12px] transition-transform duration-[400ms] ease-enter",
        visible ? "translate-y-0" : "translate-y-[calc(100%+8px)]",
      )}
    >
      <div className="mx-auto flex max-w-[430px] items-center gap-3 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <Button variant="ghost" size="lg" disabled={saving} onClick={onDiscard}>
          Descartar
        </Button>
        <Button size="lg" icon={saving ? undefined : Check} loading={saving} disabled={!canSave || saving} onClick={onSave} className="flex-1">
          {saving ? "Salvando" : saveChangesLabel(changes)}
        </Button>
      </div>
    </div>
  );
}
