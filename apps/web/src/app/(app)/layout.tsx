import { Suspense, type ReactNode } from "react";
import { AuthSplash, RequireAuth } from "@/components/auth/guards";

/** Área logada: exige sessão e aceite dos documentos obrigatórios. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth>{children}</RequireAuth>
    </Suspense>
  );
}
