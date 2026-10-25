"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@/shared/components/ds";
import { LegalReaderProvider } from "@/features/legal";
import { AccountSuspendedGate, AuthProvider } from "@/features/auth";
import { QueryProvider } from "@/shared/libs/query-provider";

/** Providers globais do app (cliente): TanStack Query → autenticação → animações → leitor de documentos legais (+ aviso de conta suspensa). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <MotionProvider>
          <LegalReaderProvider>{children}</LegalReaderProvider>
          <AccountSuspendedGate />
        </MotionProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
