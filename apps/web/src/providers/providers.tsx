"use client";

import type { ReactNode } from "react";
import { LegalReaderProvider } from "@/components/legal/legal-reader-provider";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/** Providers globais do app (cliente): TanStack Query → autenticação → leitor de documentos legais. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <LegalReaderProvider>{children}</LegalReaderProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
