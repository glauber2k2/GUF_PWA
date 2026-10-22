"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { StaffMember } from "@guf/api/admin";
import { canStaff, type StaffPermission } from "@guf/core";

interface StaffContextValue {
  staff: StaffMember;
  /** Esconde o que o papel não pode fazer (quem decide de verdade é o banco). */
  can: (permission: StaffPermission) => boolean;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ staff, children }: { staff: StaffMember; children: ReactNode }) {
  const value = useMemo<StaffContextValue>(() => ({ staff, can: (permission) => canStaff(staff.role, permission) }), [staff]);
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffContextValue {
  const value = useContext(StaffContext);
  if (!value) throw new Error("useStaff precisa estar dentro de <StaffProvider>.");
  return value;
}
