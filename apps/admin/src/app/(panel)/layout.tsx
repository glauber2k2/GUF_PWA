import { Suspense, type ReactNode } from "react";
import { LoadingScreen } from "@guf/ui";
import { StaffGate } from "@/features/auth";
import { AdminShell } from "@/features/shell";

/** Área do painel: só com colaborador ativo e segundo fator (StaffGate); moldura com o menu. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen message="Abrindo o painel" />}>
      <StaffGate>
        <AdminShell>{children}</AdminShell>
      </StaffGate>
    </Suspense>
  );
}
