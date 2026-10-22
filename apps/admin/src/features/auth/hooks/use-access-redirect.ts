"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { StaffAccess } from "@guf/api/admin";
import { useStaffAccess } from "@/features/auth/api/use-staff-session";
import { pathForAccess } from "@/features/auth/helpers/paths";
import { withDevState } from "@/shared/helpers/dev-state-path";

/**
 * Mantém cada tela de acesso no passo certo: se a situação da pessoa pede outra tela (ex.: já
 * entrou, falta o código), leva para ela. `accepts` = situações que esta tela atende.
 */
export function useAccessRedirect(accepts: StaffAccess["status"][]) {
  const router = useRouter();
  const access = useStaffAccess();
  const status = access.data?.status;
  const shouldLeave = Boolean(status && !accepts.includes(status));

  useEffect(() => {
    if (status && shouldLeave) router.replace(withDevState(pathForAccess(status)));
  }, [status, shouldLeave, router]);

  return { access, isReady: Boolean(status) && !shouldLeave };
}
