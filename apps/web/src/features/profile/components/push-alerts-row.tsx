"use client";

import { Bell } from "lucide-react";
import { COMPETITION_ALERT_GAP, type InstallPlatform } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { Switch } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { usePushAlerts, type PushAlertsStatus } from "@/features/profile/hooks/use-push-alerts";
import { RowGroup, RowIcon } from "./profile-ui";

const STATUS_HINTS: Partial<Record<PushAlertsStatus, string>> = {
  "needs-install": "No iPhone, os avisos chegam só com o app instalado na Tela de Início (Safari › Compartilhar › Adicionar à Tela de Início).",
  unsupported: "Este navegador não recebe notificações. Use o app instalado no celular.",
  blocked: "As notificações do guf estão bloqueadas neste aparelho. Libere nas configurações do navegador ou do celular e tente de novo.",
};

/**
 * Notificações neste aparelho (competição e seguidores; desligado por padrão). Ligar pede a permissão do sistema;
 * alterar exige internet. Cada aparelho liga o seu.
 */
export function PushAlertsRow({ platform, canEdit }: { platform: InstallPlatform; canEdit: boolean }) {
  const shell = useAppShell();
  const { status, isBusy, toggle } = usePushAlerts(platform);
  const available = status === "on" || status === "off";
  const locked = !canEdit || !available || isBusy;
  const hint = STATUS_HINTS[status];

  const change = async (on: boolean) => {
    const outcome = await toggle(on);
    if (outcome === "enabled") shell.showToast("Notificações ligadas", { tone: "success" });
    else if (outcome === "disabled") shell.showToast("Notificações desligadas", { tone: "info" });
    else if (outcome === "blocked") shell.showToast("Notificações bloqueadas", { tone: "warning", message: STATUS_HINTS.blocked });
    else if (typeof outcome === "object") shell.showToast("Não foi possível alterar as notificações", { tone: "error", message: outcome.error });
  };

  return (
    <RowGroup padded className={cn("flex flex-col gap-2.5", !canEdit && available && "pointer-events-none opacity-50")}>
      <div aria-disabled={locked || undefined} className="flex items-center gap-3">
        <RowIcon icon={Bell} />
        <Switch
          label="Notificações"
          checked={status === "on"}
          disabled={locked}
          onChange={(on) => void change(on)}
          className="flex-1 leading-5 font-semibold"
        />
      </div>
      <span className="text-[13px] min-[360px]:pl-12 leading-[18px] text-pretty text-fg-muted">
        Avisa neste aparelho quando alguém segue você, pede para seguir ou aceita seu pedido, e quando um competidor fica a menos de{" "}
        {COMPETITION_ALERT_GAP} pontos de passar você no mês ou passa.
      </span>
      {hint && <span className="text-[13px] min-[360px]:pl-12 leading-[18px] text-pretty text-fg-secondary">{hint}</span>}
    </RowGroup>
  );
}
