"use client";

import { useState, type FormEvent } from "react";
import { Banner, Button, PasswordField, TextField } from "@guf/ui";
import { useSignIn } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";

/** 1a–1d · E-mail e senha da equipe. O segundo fator vem na tela seguinte. */
export function LoginScreen() {
  useAccessRedirect(["signed_out"]);
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    signIn.mutate({ email: email.trim(), password });
  };

  return (
    <AuthFrame>
      <AuthHeading title="Entrar no painel">Use o e-mail da equipe guf.</AuthHeading>
      {signIn.error && (
        <Banner tone="danger" title={signIn.error.code === "invalid_credentials" ? "E-mail ou senha não conferem." : "Não foi possível entrar."}>
          {signIn.error.code === "invalid_credentials"
            ? "Confira os dois campos e tente de novo. Esqueceu a senha? Peça uma nova para uma pessoa administradora."
            : signIn.error.message}
        </Banner>
      )}
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-4">
          <TextField label="E-mail" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordField label="Senha" showStrength={false} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="tall" fullWidth loading={signIn.isPending} disabled={!email.trim() || !password}>
          Continuar
        </Button>
      </form>
      <p className="m-0 text-center text-[13px] text-fg-muted">Acesso só para a equipe. Cada ação fica registrada.</p>
    </AuthFrame>
  );
}
