import { EyeOff } from "lucide-react";
import { Icon } from "@/shared/components/ds";

/** "Só você vê." no topo da lista: medidas nunca aparecem para quem visita o perfil. */
export function PrivateNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-surface-3 px-3.5 py-3 text-[13px] leading-[18px] text-fg-secondary">
      <Icon icon={EyeOff} size={16} className="mt-px flex-none text-fg" />
      <span className="text-pretty">
        <strong className="font-semibold text-fg">Só você vê.</strong> Suas medidas não aparecem para quem visita seu perfil.
      </span>
    </div>
  );
}
