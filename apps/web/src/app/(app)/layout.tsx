import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/features/app-shell";
import { AuthSplash, RequireAuth } from "@/features/auth";
import { SocialNavAlerts } from "@/features/social";
import { TourProvider } from "@/features/onboarding";
import { WorkoutProvider } from "@/features/workout";

/**
 * Área logada: exige sessão e aceite dos documentos obrigatórios; moldura com menu inferior.
 * WorkoutProvider fica dentro do guarda (só existe no cliente, com usuário logado). TourProvider
 * (tour de onboarding) fica dentro do AppShell: só depois da abertura e com o menu inferior montado.
 * SocialNavAlerts publica os alertas do menu vindos do módulo social (o AppShell não importa features que o importam).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth>
        <WorkoutProvider>
          <AppShell>
            {/* Fontes dos alertas do menu inferior (as features publicam; o AppShell só mostra). */}
            <SocialNavAlerts />
            <TourProvider>{children}</TourProvider>
          </AppShell>
        </WorkoutProvider>
      </RequireAuth>
    </Suspense>
  );
}
