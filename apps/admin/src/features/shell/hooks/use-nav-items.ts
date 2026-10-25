"use client";

import { useStaff } from "@/features/auth";
import { ADMIN_NAV, type AdminNavItem } from "@/features/shell/constants/nav";

/** Áreas do menu que o papel pode ver, na ordem do menu (a mesma dos atalhos 1–9). */
export function useNavItems(): AdminNavItem[] {
  const { can } = useStaff();
  return ADMIN_NAV.filter((item) => !item.permission || can(item.permission));
}
