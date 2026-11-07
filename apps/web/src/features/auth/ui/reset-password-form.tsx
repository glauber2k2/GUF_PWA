"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, LockKeyhole, LockKeyholeOpen, ShieldCheck } from "lucide-react";
import { passwordProgressCaption } from "@guf/core";
import { updatePassword } from "@guf/api";
import { Banner, Button, Skeleton } from "@/shared/components/ds";
import { NewPasswordFields } from "@/shared/components/password/new-password-fields";
import { PasswordIntro, PasswordTip } from "@/shared/components/password/password-intro";
import { PasswordProgressRing } from "@/shared/components/password/password-progress-ring";
import { PasswordScreenFrame } from "@/shared/components/password/password-screen-frame";
import { PasswordSubmitBar } from "@/shared/components/password/password-submit-bar";
import { PasswordSuccess } from "@/shared/components/password/password-success";
import { usePasswordForm } from "@/shared/hooks/use-password-form";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { RecoveryAccountCard } from "@/features/auth/components/recovery-account-card";
import { useRecoverySession } from "@/features/auth/hooks/use-recovery-session";
import { PASSWORD_RECOVERY_PATH } from "@/features/auth/helpers/paths";

const SUCCESS_ROWS = [
  { icon: ShieldCheck, text: "Link de recuperação desativado" },
  { icon: Dumbbell, text: "Treinos e histórico estão intactos" },
] as const;

/**
 * /redefinir-senha · aberta pelo link do e-mail ("Esqueci minha senha" ou a equipe do guf pelo painel).
 * Protótipo "Recuperar e Alterar Senha" (1a–1c). Ninguém além da pessoa vê ou escolhe a senha.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const recovery = useRecoverySession();
  const { user } = useAuth();
  const form = usePasswordForm("recover");
  const [isSaving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDone, setDone] = useState(false);
  const goHome = () => router.replace("/");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.status.isValid || isSaving) return;
    setSaving(true);
    setFormError(null);
    const { error } = await updatePassword(getSupabaseClient(), form.next);
    setSaving(false);
    // Sucesso: a sessão do link continua aberta; "Entrar no Guf" segue o caminho normal (aceite, Início).
    if (error) setFormError(error.message);
    else setDone(true);
  };

  if (isDone) {
    return (
      <PasswordSuccess
        title="Senha redefinida"
        text="Pronto. Entre com a nova senha e volte para o treino."
        rows={SUCCESS_ROWS}
        ctaLabel="Entrar no Guf"
        onCta={goHome}
      />
    );
  }

  const isReady = recovery.status === "ready";
  const { status } = form;

  return (
    <form noValidate onSubmit={(event) => void submit(event)}>
      <PasswordScreenFrame
        barTitle="Recuperar acesso"
        onBack={() => router.replace("/login")}
        footer={
          isReady && (
            <PasswordSubmitBar label="Salvar nova senha" icon={Check} isLoading={isSaving} isDisabled={!status.isValid} hint={status.hint} />
          )
        }
      >
        {recovery.status !== "invalid" && (
          <PasswordProgressRing
            progress={status.progress}
            icon={status.progress === 100 ? LockKeyhole : LockKeyholeOpen}
            overline="Nova senha"
            caption={passwordProgressCaption(status.progress, false)}
          />
        )}
        <PasswordIntro
          title="Crie uma nova senha"
          subtitle="Escolha uma senha que você ainda não usou no Guf. Seus treinos e histórico continuam iguais."
        />
        {recovery.status === "checking" && (
          <div aria-busy="true" aria-label="Conferindo o link" className="flex flex-col gap-4">
            <Skeleton className="h-[62px] rounded-lg" />
            <Skeleton className="h-[52px] rounded-md" />
            <Skeleton className="h-[52px] rounded-md" />
          </div>
        )}
        {recovery.status === "invalid" && (
          <div className="flex flex-col gap-3">
            <Banner tone="danger">{recovery.message}</Banner>
            <Button variant="primary" size="lg" fullWidth onClick={() => router.replace(PASSWORD_RECOVERY_PATH)}>
              Pedir um link novo
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={() => router.replace("/login")}>
              Voltar para o login
            </Button>
          </div>
        )}
        {isReady && (
          <>
            {user && <RecoveryAccountCard user={user} />}
            <div className="flex flex-col gap-[18px]">
              <NewPasswordFields form={form} />
            </div>
            {formError && <Banner tone="danger">{formError}</Banner>}
            <PasswordTip>Dica: use uma frase curta com número e símbolo, como “Agachamento#120”. Evite datas e seu nome.</PasswordTip>
          </>
        )}
      </PasswordScreenFrame>
    </form>
  );
}
