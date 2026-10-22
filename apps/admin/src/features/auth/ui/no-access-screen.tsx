"use client";

import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { Button, Icon } from "@guf/ui";
import { useSignOut } from "@/features/auth/api/use-staff-session";
import { AuthFrame } from "@/features/auth/components/auth-frame";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";
import { AUTH_PATHS } from "@/features/auth/helpers/paths";

/** 1k–1m · Conta logada que não é da equipe (ou foi desativada). */
export function NoAccessScreen() {
  const { access } = useAccessRedirect(["not_staff"]);
  const router = useRouter();
  const signOut = useSignOut();
  const email = access.data?.status === "not_staff" ? access.data.email : "";

  const switchAccount = async () => {
    await signOut();
    router.replace(AUTH_PATHS.login);
  };

  return (
    <AuthFrame>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
        <span className="grid size-14 place-items-center rounded-lg bg-surface-3 text-fg-secondary">
          <Icon icon={Lock} size={26} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-2xl leading-[30px] font-bold tracking-[-0.02em]">Sua conta não tem acesso ao painel</h1>
          <p className="m-0 text-pretty text-fg-secondary">
            {email ? (
              <>
                Você entrou como <strong className="text-fg">{email}</strong>.{" "}
              </>
            ) : null}
            O painel só aceita contas da equipe liberadas por uma pessoa administradora.
          </p>
        </div>
        <span className="text-[13px] text-fg-muted">Peça para uma pessoa administradora convidar o seu e-mail da equipe.</span>
      </div>
      <Button variant="secondary" size="tall" icon={LogOut} fullWidth onClick={() => void switchAccount()}>
        Entrar com outra conta
      </Button>
    </AuthFrame>
  );
}
