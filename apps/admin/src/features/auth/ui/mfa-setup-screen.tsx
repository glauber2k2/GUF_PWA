"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Copy, QrCode } from "lucide-react";
import { isMfaCode } from "@guf/core";
import { Banner, Button, Icon, IconButton, Skeleton } from "@guf/ui";
import { useEnrollTotp, useVerifyTotp } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { CodeInput } from "@/features/auth/components/code-input";
import { useAccessRedirect } from "@/features/auth/hooks/use-access-redirect";
import { useToast } from "@/shared/libs/toast-provider";

function Step({ number, title, children }: { number: number; title: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3.5 rounded-lg border border-border bg-surface p-4">
      <span className="grid size-7 flex-none place-items-center rounded-pill bg-surface-3 font-display text-base font-bold">{number}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <strong>{title}</strong>
        {children}
      </div>
    </li>
  );
}

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP" (mais fácil de digitar). */
function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

/** 1h–1j · Primeiro acesso: configurar o segundo fator (obrigatório para entrar no painel). */
export function MfaSetupScreen() {
  const { isReady } = useAccessRedirect(["mfa_setup"]);
  const enrollment = useEnrollTotp(isReady);
  const verify = useVerifyTotp();
  const toast = useToast();
  const [code, setCode] = useState("");

  const copySecret = async () => {
    if (!enrollment.data) return;
    await navigator.clipboard.writeText(enrollment.data.secret);
    toast("Chave copiada", { tone: "success" });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (enrollment.data && isMfaCode(code)) verify.mutate({ code, factorId: enrollment.data.factorId });
  };

  return (
    <AuthFrame>
      <AuthHeading eyebrow="Primeiro acesso" title="Configurar segundo fator">
        É obrigatório para entrar no painel. Leva cerca de 2 minutos.
      </AuthHeading>
      {enrollment.isError && (
        <Banner tone="danger" title="Não foi possível gerar o QR code." actionLabel="Tentar de novo" onAction={() => void enrollment.refetch()}>
          {enrollment.error.message}
        </Banner>
      )}
      <form onSubmit={submit} className="flex flex-col gap-6">
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          <Step number={1} title="Instale um aplicativo autenticador">
            <span className="-mt-2 text-[13px] text-fg-secondary">Google Authenticator, Microsoft Authenticator ou 1Password.</span>
          </Step>
          <Step number={2} title="Leia o QR code com o aplicativo">
            <span className="-mt-2 text-[13px] text-fg-secondary">Ou digite a chave manualmente.</span>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="grid size-[132px] flex-none place-items-center rounded-md bg-white p-1.5">
                {enrollment.data?.qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element -- SVG gerado pelo Supabase (data URI), sem otimização possível
                  <img src={enrollment.data.qrCode} alt="QR code do segundo fator" className="size-full" />
                ) : enrollment.isPending ? (
                  <Skeleton className="size-full rounded-sm" />
                ) : (
                  <Icon icon={QrCode} size={40} className="text-brand-ink" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">Chave</span>
                <span className="flex items-center gap-1">
                  <code className="font-display text-lg tracking-[.06em] tabular-nums">{enrollment.data ? groupSecret(enrollment.data.secret) : "…"}</code>
                  <IconButton icon={Copy} label="Copiar chave" variant="ghost" onClick={() => void copySecret()} disabled={!enrollment.data} />
                </span>
              </div>
            </div>
          </Step>
          <Step number={3} title="Digite o código que aparece">
            <CodeInput value={code} onChange={setCode} error={verify.error?.message} />
          </Step>
        </ol>
        <Button type="submit" size="tall" fullWidth loading={verify.isPending} disabled={!enrollment.data || !isMfaCode(code)}>
          Ativar e entrar
        </Button>
      </form>
    </AuthFrame>
  );
}
