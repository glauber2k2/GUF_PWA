"use client";

import { useEffect } from "react";
import { reportAccountSuspension, useAccountSuspension } from "@/store/global/account-suspension.store";
import { useSuspendedSignOut } from "@/features/auth/hooks/use-suspended-sign-out";
import { AccountSuspendedScreen } from "@/features/auth/ui/account-suspended-screen";

const DEV_PREVIEW_STATE = "conta-suspensa";
const DEV_PREVIEW_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * Mostra o aviso de conta suspensa assim que qualquer chamada à API esbarrar na suspensão
 * (o cliente Supabase avisa o store). Montado nos Providers, vale em todas as rotas.
 */
export function AccountSuspendedGate() {
  const suspension = useAccountSuspension();
  const { secondsLeft, isLeaving, leave } = useSuspendedSignOut(Boolean(suspension));

  // Só em dev: ?estado=conta-suspensa mostra o aviso sem suspender ninguém.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const states = new URLSearchParams(window.location.search).get("estado")?.split(",") ?? [];
    if (states.includes(DEV_PREVIEW_STATE)) {
      reportAccountSuspension({ endsAt: new Date(Date.now() + DEV_PREVIEW_DAYS * DAY_MS).toISOString() });
    }
  }, []);

  if (!suspension) return null;
  return <AccountSuspendedScreen endsAt={suspension.endsAt} secondsLeft={secondsLeft} isLeaving={isLeaving} onLeave={() => void leave()} />;
}
