"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@/components/ds/motion";
import { LegalReaderProvider } from "@/components/legal/legal-reader-provider";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/** Providers globais do app (cliente): TanStack Query → autenticação → animações → leitor de documentos legais. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <MotionProvider>
          <LegalReaderProvider>{children}</LegalReaderProvider>
        </MotionProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
