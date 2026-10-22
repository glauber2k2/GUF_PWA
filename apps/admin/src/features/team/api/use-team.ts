"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, ApiResult } from "@guf/api";
import type { StaffRow } from "@guf/api/admin";
import type { StaffRole } from "@guf/core";
import { useAdminApi } from "@/shared/libs/admin-api";
import { AUDIT_KEY, TEAM_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

export function useStaffList() {
  const { apis, mockKey } = useAdminApi();
  return useQuery<StaffRow[], ApiError>({
    queryKey: [TEAM_KEY, mockKey],
    queryFn: async () => {
      const { data, error } = await apis.team.listStaff(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

function useTeamMutation<TInput>(run: (input: TInput) => Promise<ApiResult<null>>) {
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, TInput>({
    mutationFn: async (input) => {
      const { error } = await run(input);
      if (error) throw error;
      return null;
    },
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: [TEAM_KEY] }), queryClient.invalidateQueries({ queryKey: [AUDIT_KEY] })]),
  });
}

export function useSetStaffRole() {
  const { apis } = useAdminApi();
  return useTeamMutation((input: { userId: string; role: StaffRole }) => apis.team.setStaffRole(getSupabaseClient(), input));
}

export function useSetStaffDisabled() {
  const { apis } = useAdminApi();
  return useTeamMutation((input: { userId: string; disabled: boolean }) => apis.team.setStaffDisabled(getSupabaseClient(), input));
}

export function useInviteStaff() {
  const { apis } = useAdminApi();
  return useTeamMutation((input: { email: string; displayName: string; role: StaffRole }) => apis.team.inviteStaff(getSupabaseClient(), input));
}
