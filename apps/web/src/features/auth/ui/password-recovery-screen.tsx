"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Inbox, MailCheck, Repeat, Send } from "lucide-react";
import { requestPasswordRecovery } from "@guf/api";
import { passwordRecoveryRequestSchema } from "@guf/schemas";
import { Banner, Button, Icon, TextField } from "@/shared/components/ds";
import { PasswordIntro } from "@/shared/components/password/password-intro";
import { PasswordScreenFrame } from "@/shared/components/password/password-screen-frame";
import { PasswordSuccess } from "@/shared/components/password/password-success";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { getPasswordRecoveryClient } from "@/shared/libs/supabase";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { PASSWORD_RESET_PATH } from "@/features/auth/helpers/paths";

const SENT_ROWS = [
  { icon: Inbox, text: "Não chegou em alguns minutos? Confira o spam e as promoções" },
  { icon: Repeat, text: "Cada link funciona uma vez só; o mais recente é o que vale" },
] as const;

/**
 * /recuperar-senha · "Esqueci minha senha": pede o link para criar uma senha nova.
 * A resposta é a mesma exista a conta ou não (não revela quem tem conta no guf).
 * Logado (atalho de Alterar senha), o e-mail da conta já vem preenchido.
 */
export function PasswordRecoveryScreen() {
  const router = useRouter();
  const goBack = useGoBack("/login");
  const { user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordRecoveryRequestSchema),
    defaultValues: { email: user?.email ?? "" },
    mode: "onTouched",
  });

  // A sessão chega depois do primeiro desenho: preenche o e-mail da conta se o campo ainda estiver vazio.
  const accountEmail = user?.email;
  useEffect(() => {
    if (accountEmail && !getValues("email")) setValue("email", accountEmail);
  }, [accountEmail, getValues, setValue]);

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    const redirectTo = `${window.location.origin}${PASSWORD_RESET_PATH}`;
    const { error } = await requestPasswordRecovery(getPasswordRecoveryClient(), { email, redirectTo });
    if (error) setFormError(error.message);
    else setSentTo(email.trim().toLowerCase());
  });

  if (sentTo) {
    return (
      <PasswordSuccess
        title="Confira seu e-mail"
        text={`Se houver uma conta com ${sentTo}, enviamos um link para criar uma senha nova.`}
        rows={SENT_ROWS}
        ctaLabel={user ? "Voltar" : "Voltar para o login"}
        onCta={user ? goBack : () => router.replace("/login")}
      />
    );
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <PasswordScreenFrame
        barTitle="Recuperar acesso"
        onBack={goBack}
        footer={
          <Button type="submit" variant="primary" size="lg" fullWidth icon={isSubmitting ? undefined : Send} loading={isSubmitting}>
            {isSubmitting ? "Enviando" : "Enviar link"}
          </Button>
        }
      >
        <span className="grid size-[76px] animate-guf-rise place-items-center rounded-pill bg-surface-3 text-fg">
          <Icon icon={MailCheck} size={30} />
        </span>
        <PasswordIntro
          title="Esqueceu a senha?"
          subtitle="Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova; seus treinos e histórico continuam iguais."
        />
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          size="lg"
          placeholder="voce@email.com"
          error={errors.email?.message}
          className="animate-guf-rise [animation-delay:120ms]"
          {...register("email")}
        />
        {formError && <Banner tone="danger">{formError}</Banner>}
      </PasswordScreenFrame>
    </form>
  );
}
