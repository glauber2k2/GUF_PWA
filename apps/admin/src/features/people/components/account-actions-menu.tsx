"use client";

import { Megaphone } from "lucide-react";
import { useStaff } from "@/features/auth";
import { ACCOUNT_ACTIONS, accountActionsFor, type AccountActionKind, type AccountActionState } from "@/features/people/helpers/account-actions";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/action-menu";

interface AccountActionsMenuProps extends AccountActionState {
  name: string;
  /** Contas da equipe não são suspensas nem excluídas pelo painel. */
  isStaff?: boolean;
  onAction: (kind: AccountActionKind) => void;
  onAnnounce: () => void;
}

const STAFF_BLOCKED: AccountActionKind[] = ["ban", "unban", "delete", "schedule_deletion", "cancel_deletion"];

/** Três pontinhos de uma conta (linha da lista e detalhe): só o que o papel permite. */
export function AccountActionsMenu({ name, isStaff = false, onAction, onAnnounce, ...state }: AccountActionsMenuProps) {
  const { can } = useStaff();
  const actions = accountActionsFor(state).filter((kind) => can(ACCOUNT_ACTIONS[kind].permission) && !(isStaff && STAFF_BLOCKED.includes(kind)));
  const items: ActionMenuItem[] = [
    ...(can("draft_announcements") ? [{ key: "announce", label: "Enviar comunicado", icon: Megaphone, onSelect: onAnnounce }] : []),
    ...actions.map((kind) => ({
      key: kind,
      label: ACCOUNT_ACTIONS[kind].label,
      icon: ACCOUNT_ACTIONS[kind].icon,
      isDanger: ACCOUNT_ACTIONS[kind].isDanger,
      onSelect: () => onAction(kind),
    })),
  ];
  return <ActionMenu label={`Ações para ${name}`} items={items} />;
}
