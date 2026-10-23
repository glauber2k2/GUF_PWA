"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiResult, GufClient } from "@guf/api";
import type { AdminUsersApi } from "@guf/api/admin";
import type { AccountActionInput, AccountActionOutcome, AccountTarget } from "@/features/people/helpers/account-actions";
import { useAdminApi } from "@/shared/libs/admin-api";
import { PEOPLE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Uma chamada ao banco para uma pessoa (cada função admin_* confere o papel e audita). */
function callFor(users: AdminUsersApi, client: GufClient, userId: string, input: AccountActionInput): Promise<ApiResult<unknown>> {
  switch (input.kind) {
    case "plan":
      return users.setPlan(client, { userId, planCode: input.planCode, validUntil: input.validUntil, reason: input.reason, note: input.note });
    case "unlink_social":
      return users.unlinkSocialLogins(client, { userId, note: input.note });
    case "ban":
      return users.banUser(client, { userId, endsAt: input.endsAt, reason: input.reason, note: input.note });
    case "unban":
      return users.unbanUser(client, { userId, reason: input.reason, note: input.note });
    case "delete":
      return users.deleteUser(client, { userId, reason: input.reason, note: input.note });
    case "schedule_deletion":
      return users.scheduleDeletion(client, { userId, at: input.at, reason: input.reason, note: input.note });
    case "cancel_deletion":
      return users.cancelDeletion(client, { userId, reason: input.reason, note: input.note });
  }
}

/**
 * Aplica uma ação a uma ou mais contas, uma de cada vez (uma recusa — ex.: assinatura paga — não
 * impede as outras). Devolve quem deu certo e quem não, com a mensagem pronta.
 */
export function useAccountActionRunner() {
  const { apis } = useAdminApi();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const run = async (input: AccountActionInput, targets: AccountTarget[]): Promise<AccountActionOutcome> => {
    const outcome: AccountActionOutcome = { succeeded: [], failed: [] };
    const client = getSupabaseClient();
    setProgress({ done: 0, total: targets.length });
    for (const [index, target] of targets.entries()) {
      const { error } = await callFor(apis.users, client, target.userId, input);
      if (error) outcome.failed.push({ target, message: error.message });
      else outcome.succeeded.push(target);
      setProgress({ done: index + 1, total: targets.length });
    }
    setProgress(null);
    await queryClient.invalidateQueries({ queryKey: [PEOPLE_KEY] });
    return outcome;
  };

  return { run, progress, isRunning: progress !== null };
}
