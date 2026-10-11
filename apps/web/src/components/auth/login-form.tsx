"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@guf/schemas";
import { Banner, Button, GoogleButton, Logo, PasswordField, TextDivider, TextField } from "@/components/ds";
import { oauthReturnError, signInWithEmail } from "@guf/api";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { AuthFooter, AuthLink, AuthScreen } from "./auth-screen";
import { useGoogleSignIn } from "./use-google-sign-in";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { initError } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  // Erro na volta do Google: ?error=… na URL ou falha ao trocar o ?code= (PKCE).
  // Some assim que a pessoa tenta de novo (Google ou e-mail).
  const [returnErrorDismissed, setReturnErrorDismissed] = useState(false);
  const returnError =
    oauthReturnError({
      error: searchParams.get("error"),
      errorCode: searchParams.get("error_code"),
      errorDescription: searchParams.get("error_description"),
    }) ?? initError;
  // Volta da exclusão de conta (Perfil → Excluir minha conta).
  const accountDeleted = searchParams.get("conta-excluida") === "1";
  const google = useGoogleSignIn(setFormError);
  const startGoogle = () => {
    setReturnErrorDismissed(true);
    setFormError(null);
    void google.start();
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setReturnErrorDismissed(true);
    const { error } = await signInWithEmail(getSupabaseClient(), values);
    // Sucesso: o AuthProvider recebe SIGNED_IN e o guarda leva para o app (ou para ?next=).
    if (error) setFormError(error.message);
  });

  const busy = isSubmitting || google.pending;

  return (
    <AuthScreen
      variant="login"
      hero={
        <>
          <h1 className="m-0 flex w-full justify-center">
            <Logo size="2xl" />
          </h1>
          <p className="m-0 max-w-[280px] text-lg leading-[26px] text-balance text-fg-secondary">
            Registre cada série. Veja cada evolução.
          </p>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {accountDeleted && (
          <Banner tone="success" title="Sua conta foi excluída.">
            Seus dados foram apagados. Você pode criar uma nova conta quando quiser.
          </Banner>
        )}
        {returnError && !returnErrorDismissed && <Banner tone="danger">{returnError.message}</Banner>}
        <GoogleButton onClick={startGoogle} disabled={busy} aria-busy={google.pending || undefined} />
        <TextDivider />
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          size="lg"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="grid gap-1.5">
          <PasswordField
            label="Senha"
            placeholder="Sua senha"
            autoComplete="current-password"
            showStrength={false}
            size="lg"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <AuthLink href="/recuperar-senha" prefetch={false} className="flex min-h-11 items-center text-sm font-medium">
              Esqueci minha senha
            </AuthLink>
          </div>
        </div>
        {formError && <Banner tone="danger">{formError}</Banner>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={google.pending}>
          {isSubmitting ? "Entrando" : "Entrar"}
        </Button>
        <AuthFooter question="Não tem conta?" className="min-h-11">
          <AuthLink href="/cadastro">Criar conta</AuthLink>
        </AuthFooter>
      </form>
    </AuthScreen>
  );
}
