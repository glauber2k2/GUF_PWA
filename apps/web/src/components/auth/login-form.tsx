"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@guf/schemas";
import { Banner, Button, GoogleButton, Logo, PasswordField, TextDivider, TextField } from "@/components/ds";
import { signInWithEmail } from "@guf/api";
import { getSupabaseClient } from "@/lib/supabase";
import { AuthFooter, AuthLink, AuthScreen } from "./auth-screen";
import { useGoogleSignIn } from "./use-google-sign-in";

export function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const google = useGoogleSignIn(setFormError);
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
        <GoogleButton onClick={google.start} disabled={busy} aria-busy={google.pending || undefined} />
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
