"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, KeyRound, Lock, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { passwordProgressCaption } from "@guf/core";
import { AUTH_ERROR_MESSAGES, changePassword } from "@guf/api";
import { Banner, Icon, Switch } from "@/shared/components/ds";
import { NewPasswordFields } from "@/shared/components/password/new-password-fields";
import { PasswordInputField } from "@/shared/components/password/password-input-field";
import { PasswordIntro, PasswordTip } from "@/shared/components/password/password-intro";
import { PasswordProgressRing } from "@/shared/components/password/password-progress-ring";
import { PasswordScreenFrame } from "@/shared/components/password/password-screen-frame";
import { PasswordSubmitBar } from "@/shared/components/password/password-submit-bar";
import { PasswordSuccess } from "@/shared/components/password/password-success";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { usePasswordForm } from "@/shared/hooks/use-password-form";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { PASSWORD_RECOVERY_PATH } from "@/features/auth";
import { useCanEditProfile, useProfile } from "@/features/profile/api/use-profile";
import { SETTINGS_PATH } from "@/features/profile/helpers/paths";

/** Resumo depois de trocar: o que aconteceu com os outros aparelhos e com este. */
function buildSuccessRows(signedOutOthers: boolean) {
  return [
    { icon: Smartphone, text: signedOutOthers ? "Os outros aparelhos foram desconectados" : "Os outros aparelhos continuam conectados" },
    { icon: ShieldCheck, text: "Este aparelho continua conectado" },
  ];
}

/**
 * Configurações › Alterar senha (protótipo "Recuperar e Alterar Senha", 2a–2c). Pede a senha atual:
 * sem ela, quem pegasse o aparelho desbloqueado trocaria a senha e tomaria a conta. Só com internet.
 */
export function ChangePasswordScreen() {
  const router = useRouter();
  const goBack = useGoBack(SETTINGS_PATH);
  const profile = useProfile();
  const canEdit = useCanEditProfile();
  const form = usePasswordForm("change");
  const [isSaving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signedOutOthers, setSignedOutOthers] = useState<boolean | null>(null);
  const hasNoPassword = profile.data?.hasPasswordLogin === false;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.status.isValid || isSaving || !canEdit) return;
    setSaving(true);
    setFormError(null);
    const { error } = await changePassword(getSupabaseClient(), {
      currentPassword: form.current,
      newPassword: form.next,
      signOutOthers: form.signsOutOthers,
    });
    setSaving(false);
    if (!error) setSignedOutOthers(form.signsOutOthers);
    else if (error.code === "current_password_invalid") form.rejectCurrent();
    else setFormError(error.message);
  };

  if (signedOutOthers !== null) {
    return (
      <PasswordSuccess
        title="Senha alterada"
        text="A partir de agora, use a nova senha para entrar."
        rows={buildSuccessRows(signedOutOthers)}
        ctaLabel="Voltar às configurações"
        onCta={() => router.replace(SETTINGS_PATH)}
      />
    );
  }

  const { status } = form;

  return (
    <form noValidate onSubmit={(event) => void submit(event)}>
      <PasswordScreenFrame
        barTitle="Segurança"
        onBack={goBack}
        footer={
          !hasNoPassword && (
            <PasswordSubmitBar label="Alterar senha" icon={Check} isLoading={isSaving} isDisabled={!status.isValid || !canEdit} hint={status.hint} />
          )
        }
      >
        <PasswordProgressRing
          progress={status.progress}
          icon={status.progress === 100 ? LockKeyhole : KeyRound}
          overline="Alterar senha"
          caption={passwordProgressCaption(status.progress, form.isCurrentRejected)}
        />
        <PasswordIntro
          title="Alterar sua senha"
          subtitle="Confirme a senha atual e escolha uma nova. Você continua conectado neste aparelho."
        />
        {!canEdit && (
          <Banner tone="warning" title="Sem conexão">
            para alterar a senha, conecte-se à internet.
          </Banner>
        )}
        {hasNoPassword ? (
          <Banner tone="info">{AUTH_ERROR_MESSAGES.password_login_unavailable}</Banner>
        ) : (
          <>
            <div className="flex flex-col gap-[18px]">
              <PasswordInputField
                id="password-current"
                label="Senha atual"
                value={form.current}
                onChange={form.changeCurrent}
                icon={Lock}
                autoComplete="current-password"
                placeholder="Sua senha de hoje"
                error={form.isCurrentRejected ? AUTH_ERROR_MESSAGES.current_password_invalid : null}
                shakeKey={form.rejectionCount}
                labelAction={
                  <Link href={PASSWORD_RECOVERY_PATH} className="text-[13px] font-semibold text-accent-text no-underline hover:text-fg">
                    Esqueci minha senha
                  </Link>
                }
              />
              <NewPasswordFields form={form} />
            </div>
            <div className="flex animate-guf-rise items-center gap-3 rounded-lg border border-border bg-surface p-3.5 [animation-delay:220ms]">
              <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                <Icon icon={Smartphone} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">Sair dos outros aparelhos</span>
                <span className="text-[13px] leading-[18px] text-pretty text-fg-muted">Outros celulares e navegadores vão pedir a nova senha.</span>
              </div>
              <Switch checked={form.signsOutOthers} onChange={form.setSignsOutOthers} label="Sair dos outros aparelhos" hideLabel />
            </div>
            {formError && <Banner tone="danger">{formError}</Banner>}
            <PasswordTip>Uma frase curta com números e símbolo é fácil de lembrar e difícil de adivinhar, como “Supino#90kg”.</PasswordTip>
          </>
        )}
      </PasswordScreenFrame>
    </form>
  );
}
