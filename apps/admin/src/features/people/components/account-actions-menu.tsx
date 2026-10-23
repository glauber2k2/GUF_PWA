"use client";

import { Megaphone } from "lucide-react";
import { useStaff } from "@/features/auth";
import { ACCOUNT_ACTIONS, accountActionsFor, isRiskyAction, type AccountActionKind, type AccountActionState } from "@/features/people/helpers/account-actions";
import { ActionMenu, type ActionMenuItem } from "@/shared/components/action-menu";

interface AccountActionsMenuProps extends AccountActionState {
  name: string;
  onAction: (kind: AccountActionKind) => void;
  onAnnounce: () => void;
}

/** Três pontinhos de uma conta (linha da lista e detalhe): as ações da conta que o papel permite. */
export function AccountActionsMenu({ name, onAction, onAnnounce, ...state }: AccountActionsMenuProps) {
  const { can } = useStaff();
  const actions = accountActionsFor(state).filter((kind) => can(ACCOUNT_ACTIONS[kind].permission));
  const items: ActionMenuItem[] = [
    ...(can("draft_announcements") ? [{ key: "announce", label: "Enviar comunicado", icon: Megaphone, onSelect: onAnnounce }] : []),
    ...actions.map((kind) => ({
      key: kind,
      label: ACCOUNT_ACTIONS[kind].label,
      icon: ACCOUNT_ACTIONS[kind].icon,
      isDanger: isRiskyAction(kind),
      onSelect: () => onAction(kind),
    })),
  ];
  return <ActionMenu label={`Ações para ${name}`} items={items} />;
}
