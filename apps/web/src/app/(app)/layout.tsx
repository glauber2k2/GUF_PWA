import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/features/app-shell";
import { AuthSplash, RequireAuth } from "@/features/auth";
import { TourProvider } from "@/features/onboarding";
import { WorkoutProvider } from "@/features/workout";

/**
 * Área logada: exige sessão e aceite dos documentos obrigatórios; moldura com menu inferior.
 * WorkoutProvider fica dentro do guarda (só existe no cliente, com usuário logado). TourProvider
 * (tour de onboarding) fica dentro do AppShell: só depois da abertura e com o menu inferior montado.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth>
        <WorkoutProvider>
          <AppShell>
            <TourProvider>{children}</TourProvider>
          </AppShell>
        </WorkoutProvider>
      </RequireAuth>
    </Suspense>
  );
}
