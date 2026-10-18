import { Suspense, type ReactNode } from "react";
import { AuthSplash, RequireAuth } from "@/features/auth";

/** Portão /aceite: exige sessão; sem pendências, volta para o app. */
export default function ConsentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RequireAuth mode="consent">{children}</RequireAuth>
    </Suspense>
  );
}
