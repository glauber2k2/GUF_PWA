"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@guf/ui";
import { QueryProvider } from "@/shared/libs/query-provider";
import { ToastProvider } from "@/shared/libs/toast-provider";

/** Raiz de composição do painel. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <MotionProvider>
        <ToastProvider>{children}</ToastProvider>
      </MotionProvider>
    </QueryProvider>
  );
}
