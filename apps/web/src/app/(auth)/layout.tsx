import { Suspense, type ReactNode } from "react";
import { AuthSplash, RedirectIfAuthenticated } from "@/features/auth";

/** Telas de acesso: quem já está logado segue para o app. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthSplash />}>
      <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>
    </Suspense>
  );
}
