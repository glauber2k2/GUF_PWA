"use client";

import {
  adminUsersApi,
  announcementsAdminApi,
  staffSessionApi,
  staffTeamApi,
  type AdminUsersApi,
  type AnnouncementsAdminApi,
  type StaffSessionApi,
  type StaffTeamApi,
} from "@guf/api/admin";
import { mockAdminUsersApi, mockAnnouncementsAdminApi, mockStaffSessionApi, mockStaffTeamApi } from "@/mocks/admin-api";
import { setAdminMockScenario } from "@/mocks/admin-data";
import { useDevAdminState, type DevAdminState } from "@/shared/hooks/use-dev-admin-state";

export interface AdminApis {
  session: StaffSessionApi;
  users: AdminUsersApi;
  announcements: AnnouncementsAdminApi;
  team: StaffTeamApi;
}

const REAL: AdminApis = { session: staffSessionApi, users: adminUsersApi, announcements: announcementsAdminApi, team: staffTeamApi };
const MOCK: AdminApis = { session: mockStaffSessionApi, users: mockAdminUsersApi, announcements: mockAnnouncementsAdminApi, team: mockStaffTeamApi };

/**
 * Ponto único de escolha dos contratos: dados reais por padrão; em DESENVOLVIMENTO com ?estado=,
 * os mocks (mesma assinatura). As telas dependem só dos contratos, nunca do cliente direto.
 */
export function useAdminApi(): { apis: AdminApis; dev: DevAdminState; mockKey: string | null } {
  const dev = useDevAdminState();
  if (process.env.NODE_ENV === "development" && dev.role) {
    setAdminMockScenario({ role: dev.role, access: dev.access, forceError: dev.forceError, empty: dev.empty });
    return { apis: MOCK, dev, mockKey: `${dev.role}-${dev.access}-${dev.forceError}-${dev.empty}` };
  }
  return { apis: REAL, dev, mockKey: null };
}
