import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AuthSplash, RequireAuth } from "@/components/auth/guards";
import { WorkoutProvider } from "@/components/workout/workout-provider";

/**
 * Área logada: exige sessão e aceite dos documentos obrigatórios; moldura com menu inferior.
 * WorkoutProvider fica dentro do guarda (só existe no cliente, com usuário logado).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth>
        <WorkoutProvider>
          <AppShell>{children}</AppShell>
        </WorkoutProvider>
      </RequireAuth>
    </Suspense>
  );
}
