"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { oauthReturnError } from "@guf/api";
import { Banner, Button, GoogleButton, PasswordField, TextDivider, TextField } from "@guf/ui";
import { useGoogleSignIn, useSignIn } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";
import { AUTH_PATHS } from "@/features/auth/helpers/paths";
import { withDevState } from "@/shared/helpers/dev-state-path";

/**
 * 1a–1d · Entrar: Google ou e-mail e senha da equipe. O segundo fator vem na tela seguinte em
 * qualquer caso, e quem não é da equipe cai em "Sem acesso" (o banco confere).
 */
export function LoginScreen() {
  useAccessRedirect(["signed_out"]);
  const searchParams = useSearchParams();
  const signIn = useSignIn();
  const google = useGoogleSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [returnErrorDismissed, setReturnErrorDismissed] = useState(false);

  // Volta do Google com erro (cancelou, link expirado, provedor desligado).
  const googleReturnError = returnErrorDismissed
    ? null
    : oauthReturnError({
        error: searchParams.get("error"),
        errorCode: searchParams.get("error_code"),
        errorDescription: searchParams.get("error_description"),
      });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setReturnErrorDismissed(true);
    signIn.mutate({ email: email.trim(), password });
  };

  const startGoogle = () => {
    setReturnErrorDismissed(true);
    google.mutate(`${window.location.origin}${AUTH_PATHS.login}/`);
  };

  return (
    <AuthFrame>
      <AuthHeading title="Entrar no painel">Use a conta da equipe guf.</AuthHeading>
      {googleReturnError && (
        <Banner tone="danger" title="Não foi possível entrar com o Google.">
          {googleReturnError.message}
        </Banner>
      )}
      {google.error && <Banner tone="danger">{google.error.message}</Banner>}
      {signIn.error && (
        <Banner tone="danger" title={signIn.error.code === "invalid_credentials" ? "E-mail ou senha não conferem." : "Não foi possível entrar."}>
          {signIn.error.code === "invalid_credentials" ? "Confira os dois campos e tente de novo, ou use “Esqueci a senha”." : signIn.error.message}
        </Banner>
      )}
      <GoogleButton onClick={startGoogle} disabled={google.isPending || signIn.isPending} />
      <TextDivider />
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-4">
          <TextField label="E-mail" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex flex-col gap-2">
            <PasswordField label="Senha" showStrength={false} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Link href={withDevState(AUTH_PATHS.forgotPassword)} className="self-end text-[13px] font-semibold text-accent-text no-underline hover:underline">
              Esqueci a senha
            </Link>
          </div>
        </div>
        <Button type="submit" size="tall" fullWidth loading={signIn.isPending} disabled={!email.trim() || !password || google.isPending}>
          Continuar
        </Button>
      </form>
      <p className="m-0 text-center text-[13px] text-fg-muted">Acesso só para a equipe. Cada ação fica registrada.</p>
    </AuthFrame>
  );
}
