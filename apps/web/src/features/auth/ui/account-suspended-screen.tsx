"use client";

import { useEffect, useRef } from "react";
import { CalendarClock, LogOut, Mail, ShieldAlert } from "lucide-react";
import { ACCOUNT_SUSPENDED_NOTICE_SECONDS, PRIVACY_CONTACT_EMAIL, suspensionPeriodLabel } from "@guf/core";
import { Button, GufLoader, Icon, Logo, ScreenPortal } from "@/shared/components/ds";

interface AccountSuspendedScreenProps {
  /** Fim da suspensão (ISO 8601); `null` = indeterminada. */
  endsAt: string | null;
  secondsLeft: number;
  isLeaving: boolean;
  onLeave: () => void;
}

/**
 * Aviso de conta suspensa, por cima de tudo (z-[90], acima do tour): explica, mostra o prazo e o
 * canal para contestar e sai da conta ao fim da contagem. Não fecha: a conta não pode mais usar o app.
 */
export function AccountSuspendedScreen({ endsAt, secondsLeft, isLeaving, onLeave }: AccountSuspendedScreenProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const elapsedPct = ((ACCOUNT_SUSPENDED_NOTICE_SECONDS - secondsLeft) / ACCOUNT_SUSPENDED_NOTICE_SECONDS) * 100;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <ScreenPortal>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-suspended-title"
        aria-describedby="account-suspended-text"
        className="fixed inset-0 z-[90] overflow-y-auto bg-background text-fg"
      >
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pt-[env(safe-area-inset-top)]">
          <header className="flex h-[52px] flex-none items-center justify-center">
            <Logo className="h-6" />
          </header>

          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 pb-6 text-center">
            <span className="grid size-20 animate-guf-rise place-items-center rounded-full bg-banner-danger text-danger">
              <Icon icon={ShieldAlert} size={40} />
            </span>

            <div className="flex animate-guf-rise flex-col items-center gap-2.5 [animation-delay:80ms]">
              <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Conta suspensa</span>
              <h1
                id="account-suspended-title"
                ref={titleRef}
                tabIndex={-1}
                className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] outline-none"
              >
                Sua conta foi suspensa
              </h1>
              <p id="account-suspended-text" className="m-0 max-w-[320px] text-[15px] leading-[22px] text-pretty text-fg-secondary">
                A equipe do guf suspendeu o acesso a esta conta. Você vai sair do app e só poderá entrar de novo quando a suspensão
                terminar.
              </p>
            </div>

            <div className="flex w-full animate-guf-rise flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left [animation-delay:160ms]">
              <div className="flex items-start gap-3">
                <Icon icon={CalendarClock} size={20} className="mt-0.5 flex-none text-fg-muted" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-semibold text-fg-muted">Prazo</span>
                  <span className="text-[15px] font-semibold">{suspensionPeriodLabel(endsAt)}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon={Mail} size={20} className="mt-0.5 flex-none text-fg-muted" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-semibold text-fg-muted">Para saber o motivo ou contestar</span>
                  <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="text-[15px] font-semibold break-all text-accent-text underline-offset-2 hover:underline">
                    {PRIVACY_CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </main>

          <div className="flex flex-none animate-guf-rise flex-col items-stretch gap-3 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] [animation-delay:240ms]">
            <Button size="lg" variant="secondary" icon={LogOut} fullWidth loading={isLeaving} onClick={onLeave}>
              Sair agora
            </Button>
            <div className="flex flex-col items-center gap-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <span
                  className="block h-full bg-danger transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>
              <span aria-live="polite" className="text-sm text-fg-secondary tabular-nums">
                {isLeaving ? "Saindo da conta…" : `Saindo da conta em ${secondsLeft} s`}
              </span>
            </div>
          </div>
        </div>

        {isLeaving && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background">
            <GufLoader variant={2} size={56} layout="column" text="Saindo da conta" />
          </div>
        )}
      </div>
    </ScreenPortal>
  );
}
