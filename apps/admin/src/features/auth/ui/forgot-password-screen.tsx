"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Banner, Button, Icon, TextField } from "@guf/ui";
import { useRequestPasswordReset } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";
import { AUTH_PATHS, PASSWORD_RESET_PARAM, PASSWORD_RESET_VALUE } from "@/features/auth/helpers/paths";
import { withDevState } from "@/shared/helpers/dev-state-path";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Esqueci a senha: manda um link para criar uma senha nova. A resposta é a mesma exista ou não a
 * conta (não confirma quais e-mails são da equipe). O segundo fator continua obrigatório depois.
 */
export function ForgotPasswordScreen() {
  useAccessRedirect(["signed_out"]);
  const router = useRouter();
  const reset = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isValid = EMAIL_PATTERN.test(email.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    const redirectTo = `${window.location.origin}${AUTH_PATHS.firstAccess}/?${PASSWORD_RESET_PARAM}=${PASSWORD_RESET_VALUE}`;
    reset.mutate({ email: email.trim(), redirectTo }, { onSuccess: () => setSentTo(email.trim()) });
  };

  const back = () => router.push(withDevState(AUTH_PATHS.login));

  if (sentTo) {
    return (
      <AuthFrame>
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
          <span className="grid size-14 place-items-center rounded-lg bg-accent-tile text-accent-text">
            <Icon icon={MailCheck} size={26} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-2xl leading-[30px] font-bold tracking-[-0.02em]">Confira seu e-mail</h1>
            <p className="m-0 text-pretty text-fg-secondary">
              Se <strong className="text-fg">{sentTo}</strong> tiver conta, enviamos um link para criar uma senha nova. Abra o link neste mesmo navegador.
            </p>
          </div>
          <span className="text-[13px] text-fg-muted">Não chegou? Confira o spam ou peça de novo em alguns minutos.</span>
        </div>
        <Button variant="secondary" size="tall" icon={ArrowLeft} fullWidth onClick={back}>
          Voltar para entrar
        </Button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <AuthHeading title="Esqueci a senha">Digite o e-mail da conta. Enviamos um link para criar uma senha nova.</AuthHeading>
      {reset.error && <Banner tone="danger">{reset.error.message}</Banner>}
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <TextField label="E-mail" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" size="tall" fullWidth loading={reset.isPending} disabled={!isValid}>
          Enviar link
        </Button>
      </form>
      <Button variant="ghost" icon={ArrowLeft} onClick={back} className="self-start">
        Voltar
      </Button>
    </AuthFrame>
  );
}
