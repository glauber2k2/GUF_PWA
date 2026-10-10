import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AuthSplash, RequireAuth } from "@/components/auth/guards";

/** Área logada: exige sessão e aceite dos documentos obrigatórios; moldura com menu inferior. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </Suspense>
  );
}
