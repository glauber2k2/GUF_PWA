"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isMfaCode } from "@guf/core";
import { Button } from "@guf/ui";
import { useSignOut, useVerifyTotp } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { CodeInput } from "@/features/auth/components/code-input";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";
import { AUTH_PATHS } from "@/features/auth/helpers/paths";

/** 1e–1g · Código do aplicativo autenticador (segundo fator, obrigatório). */
export function MfaCodeScreen() {
  useAccessRedirect(["mfa_challenge"]);
  const router = useRouter();
  const verify = useVerifyTotp();
  const signOut = useSignOut();
  const [code, setCode] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isMfaCode(code)) verify.mutate({ code });
  };

  const back = async () => {
    await signOut();
    router.replace(AUTH_PATHS.login);
  };

  return (
    <AuthFrame>
      <AuthHeading title="Código de verificação">
        Abra o aplicativo autenticador e digite o código de 6 números da conta “guf admin”.
      </AuthHeading>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <CodeInput value={code} onChange={setCode} error={verify.error?.message} autoFocus />
        <Button type="submit" size="tall" fullWidth loading={verify.isPending} disabled={!isMfaCode(code)}>
          Entrar
        </Button>
      </form>
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => void back()}>
          Voltar
        </Button>
        <Button variant="ghost" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
          Perdi o acesso ao app
        </Button>
      </div>
      {showHelp && (
        <p className="m-0 rounded-md bg-surface-3 px-3.5 py-3 text-[13px] text-pretty text-fg-secondary">
          Peça para uma pessoa administradora apagar o seu segundo fator no Supabase (Authentication › Users › MFA). No próximo
          acesso você configura de novo.
        </p>
      )}
    </AuthFrame>
  );
}
