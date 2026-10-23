"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@guf/api";
import { newPasswordSchema } from "@guf/schemas";
import { Banner, Button, Logo, PasswordField, Skeleton } from "@/shared/components/ds";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { AuthFooter, AuthLink, AuthScreen } from "@/features/auth/components/auth-screen";
import { useRecoverySession } from "@/features/auth/hooks/use-recovery-session";

/**
 * /redefinir-senha · aberta pelo link do e-mail que a equipe do guf mandou (painel → Redefinir senha).
 * A pessoa cria a senha nova; a equipe nunca vê nem escolhe a senha.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const recovery = useRecoverySession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    const { error } = await updatePassword(getSupabaseClient(), password);
    // Sucesso: a sessão do link continua aberta; o app segue o caminho normal (aceite, Início).
    if (error) setFormError(error.message);
    else router.replace("/");
  });

  return (
    <AuthScreen
      variant="login"
      hero={
        <>
          <h1 className="m-0 flex w-full justify-center">
            <Logo size="2xl" />
          </h1>
          <p className="m-0 max-w-[280px] text-lg leading-[26px] text-balance text-fg-secondary">Crie uma senha nova para entrar no guf.</p>
        </>
      }
    >
      {recovery.status === "checking" && (
        <div aria-busy="true" aria-label="Conferindo o link" className="flex flex-col gap-4">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      )}
      {recovery.status === "invalid" && (
        <div className="flex flex-col gap-4">
          <Banner tone="danger">{recovery.message}</Banner>
          <AuthFooter question="Lembrou a senha?" className="min-h-11">
            <AuthLink href="/login">Entrar</AuthLink>
          </AuthFooter>
        </div>
      )}
      {recovery.status === "ready" && (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <PasswordField label="Senha nova" autoComplete="new-password" size="lg" error={errors.password?.message} {...register("password")} />
          <PasswordField
            label="Repita a senha nova"
            autoComplete="new-password"
            showStrength={false}
            size="lg"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          {formError && <Banner tone="danger">{formError}</Banner>}
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {isSubmitting ? "Salvando" : "Salvar senha nova"}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
