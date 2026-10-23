"use client";

import { UserCog, UserPlus, UserX } from "lucide-react";
import type { StaffRow } from "@guf/api/admin";
import { ActionMenu } from "@/shared/components/action-menu";

interface MemberMenuProps {
  member: StaffRow;
  onChangeRole: () => void;
  onToggleDisabled: () => void;
}

/** Três pontinhos do colaborador: mudar papel e desativar/reativar. */
export function MemberMenu({ member, onChangeRole, onToggleDisabled }: MemberMenuProps) {
  const disabled = member.status === "disabled";
  return (
    <ActionMenu
      label={`Ações para ${member.displayName}`}
      items={[
        { key: "role", label: "Mudar papel", icon: UserCog, onSelect: onChangeRole },
        { key: "toggle", label: disabled ? "Reativar" : "Desativar", icon: disabled ? UserPlus : UserX, onSelect: onToggleDisabled, isDanger: !disabled },
      ]}
    />
  );
}
