"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useProfileSetupStatus } from "@/features/onboarding/api/use-profile-setup";
import { PROFILE_SETUP_PATH } from "@/features/onboarding/constants/profile-setup";

/**
 * Conta nova vai para o cadastro em passos antes do resto do app. Sem resposta (offline, erro) não
 * leva: o app nunca fica preso nesta etapa.
 */
export function ProfileSetupRedirect() {
  const status = useProfileSetupStatus();
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const router = useRouter();
  const isPending = status.data?.isCompleted === false;

  useEffect(() => {
    if (isPending && pathname !== PROFILE_SETUP_PATH) router.replace(withDevState(PROFILE_SETUP_PATH));
  }, [isPending, pathname, router]);

  return null;
}
