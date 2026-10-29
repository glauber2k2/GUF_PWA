import { ChevronLeft, X } from "lucide-react";
import { IconButton } from "@/shared/components/ds";

/** Topo da folha "Iniciar treino": voltar (só na escolha de projeto), título e fechar. */
export function StartSheetHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="flex min-h-12 items-center gap-1">
      {onBack && <IconButton icon={ChevronLeft} label="Voltar para os treinos" variant="ghost" onClick={onBack} className="-ml-2.5" />}
      <h2 className="m-0 min-w-0 flex-1 text-xl leading-[26px] font-bold tracking-[-0.01em]">{title}</h2>
      <IconButton icon={X} label="Fechar" variant="ghost" onClick={onClose} className="-mr-2.5" />
    </div>
  );
}
