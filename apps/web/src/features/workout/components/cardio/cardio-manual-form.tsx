"use client";

import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ds";

/** Registro manual (tempo lido no painel do aparelho): abre a folha da série com o teclado do app. */
export function CardioManualForm({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex animate-guf-rise-fast flex-col gap-2 px-4 pt-1 pb-4">
      <p className="m-0 text-[13px] leading-[18px] text-fg-secondary">Digite o tempo e, se quiser, a distância que o aparelho mostrou.</p>
      <Button variant="secondary" size="tall" icon={Plus} fullWidth onClick={onAdd}>
        Adicionar série
      </Button>
    </div>
  );
}
