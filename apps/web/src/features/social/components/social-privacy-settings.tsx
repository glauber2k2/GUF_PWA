"use client";

import { EyeOff, Info, Lock, type LucideIcon } from "lucide-react";
import { socialPrivacySummary } from "@guf/core";
import type { MySocial } from "@guf/api";
import { Icon, Switch } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useUpdateSocialSettings } from "@/features/social/api/use-social";

function PrivacyRow({ icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 py-3">
      <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
        <Icon icon={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-[15px] leading-5">{title}</strong>
        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">{description}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Perfil privado e ocultar histórico (regras aceitas no cadastro, nos Termos e na Política).
 * Abrir aceita os pedidos pendentes; fechar mantém quem já segue (só quem chegar depois precisa
 * de aprovação); ocultar o histórico vale na hora.
 */
export function SocialPrivacySettings({ social, disabled = false }: { social: MySocial; disabled?: boolean }) {
  const update = useUpdateSocialSettings();
  const { showToast } = useAppShell();

  const save = (visibility: MySocial["visibility"], historyHidden: boolean) =>
    update.mutate(
      { visibility, historyHidden },
      {
        onSuccess: () => {
          if (visibility === social.visibility) return;
          showToast(visibility === "open" ? "Perfil aberto" : "Perfil privado", {
            tone: "success",
            message:
              visibility === "open"
                ? "Qualquer pessoa no guf vê sua evolução e sequência."
                : "Quem já segue você continua. Novas pessoas precisam da sua aprovação.",
          });
        },
        onError: (error) => showToast(error.message, { tone: "error" }),
      },
    );

  return (
    <div className="flex flex-col gap-1">
      <PrivacyRow icon={Lock} title="Perfil privado" description="Só seguidores aprovados veem sua evolução e sequência.">
        <Switch
          label="Perfil privado"
          checked={social.visibility === "private"}
          disabled={disabled || update.isPending}
          onChange={(isPrivate) => save(isPrivate ? "private" : "open", social.historyHidden)}
        />
      </PrivacyRow>
      <div className="h-px bg-border" />
      <PrivacyRow icon={EyeOff} title="Ocultar histórico de treinos" description="Ninguém vê seus treinos, nem seguidores. Vale com o perfil aberto ou privado.">
        <Switch
          label="Ocultar histórico de treinos"
          checked={social.historyHidden}
          disabled={disabled || update.isPending}
          onChange={(hidden) => save(social.visibility, hidden)}
        />
      </PrivacyRow>
      <div className="mt-2 flex items-start gap-2.5 rounded-md bg-surface-3 px-3.5 py-3 text-[13px] leading-[18px] text-fg-secondary">
        <Icon icon={Info} size={16} className="mt-px flex-none text-info" />
        <span>{socialPrivacySummary(social.visibility, social.historyHidden)}</span>
      </div>
    </div>
  );
}
