"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner, LoadingScreen } from "@guf/ui";
import { useStaffAccess } from "@/features/auth/api/use-staff-session";
import { pathForAccess } from "@/features/auth/helpers/paths";
import { StaffProvider } from "@/features/auth/providers/staff-provider";
import { withDevState } from "@/shared/helpers/dev-state-path";

/**
 * Portão do painel: só desenha as telas com colaborador ativo e segundo fator confirmado (aal2).
 * Sem isso, leva para o passo que falta. O banco confere de novo em cada função admin_*.
 */
export function StaffGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const access = useStaffAccess();
  const status = access.data?.status;

  useEffect(() => {
    if (status && status !== "ready") router.replace(withDevState(pathForAccess(status)));
  }, [status, router]);

  if (access.isError) {
    return (
      <div className="mx-auto w-full max-w-[460px] p-6">
        <Banner tone="danger" title="Não foi possível abrir o painel." actionLabel="Tentar de novo" onAction={() => void access.refetch()}>
          {access.error.message}
        </Banner>
      </div>
    );
  }
  if (access.data?.status !== "ready") return <LoadingScreen message="Abrindo o painel" />;
  return <StaffProvider staff={access.data.staff}>{children}</StaffProvider>;
}
