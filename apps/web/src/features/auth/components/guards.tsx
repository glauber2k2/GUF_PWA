"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner, LoadingScreen } from "@/shared/components/ds";
import { usePendingDocuments } from "@/features/auth/api/use-pending-documents";
import { loginPathFor, safeNextPath } from "@/features/auth/helpers/redirect";
import { useAuth } from "@/features/auth/providers/auth-provider";

/*
 * Proteção de rotas NO CLIENTE (site estático). É só experiência de uso:
 * quem protege os dados de verdade é o RLS do Supabase.
 * Usam useSearchParams → os layouts envolvem os guardas em <Suspense>.
 */

/** Tela de abertura (logo animada) enquanto a sessão e os aceites são verificados. */
export function AuthSplash() {
  return <LoadingScreen />;
}

function GuardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[430px] content-center px-6">
      <Banner tone="danger" actionLabel="Tentar" onAction={onRetry}>
        Não foi possível verificar sua conta. Verifique a internet e tente de novo.
      </Banner>
    </div>
  );
}

function useRedirect(target: string | null) {
  const router = useRouter();
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);
}

/**
 * Rotas que exigem login.
 * - mode "app": sem sessão → /login?next=…; com documentos pendentes → /aceite?next=…
 * - mode "consent" (/aceite): sem sessão → /login; sem pendências → next (ou /)
 */
export function RequireAuth({ children, mode = "app" }: { children: ReactNode; mode?: "app" | "consent" }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pending = usePendingDocuments();
  const hasPending = (pending.data?.length ?? 0) > 0;
  const search = searchParams.toString();

  let target: string | null = null;
  if (!isLoading && !user) {
    target = loginPathFor(pathname, search);
  } else if (user && pending.isSuccess) {
    if (mode === "app" && hasPending) {
      const current = `${pathname}${search ? `?${search}` : ""}`;
      target = current === "/" ? "/aceite" : `/aceite?next=${encodeURIComponent(current)}`;
    } else if (mode === "consent" && !hasPending) {
      target = safeNextPath(searchParams.get("next")) ?? "/";
    }
  }
  useRedirect(target);

  if (user && pending.isError) return <GuardError onRetry={() => void pending.refetch()} />;
  if (!user || !pending.isSuccess || target) return <AuthSplash />;
  return children;
}

/** Login/cadastro: quem já está logado segue para next (ou /). */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const target = !isLoading && user ? (safeNextPath(searchParams.get("next")) ?? "/") : null;
  useRedirect(target);

  if (isLoading || user) return <AuthSplash />;
  return children;
}
