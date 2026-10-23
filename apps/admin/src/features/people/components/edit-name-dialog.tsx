"use client";

import type { AdminUserDetail } from "@guf/api/admin";
import { TextField } from "@guf/ui";
import { useUpdateName } from "@/features/people/api/use-people";
import { AccountChangeDialog } from "@/features/people/components/account-change-dialog";
import { useNameField } from "@/features/people/hooks/use-name-field";

interface EditNameDialogProps {
  person: AdminUserDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** 5c · Editar o nome do perfil de uma pessoa (com motivo; a pessoa recebe um aviso no app). */
export function EditNameDialog({ person, onClose, onSaved }: EditNameDialogProps) {
  const field = useNameField(person.name);
  const updateName = useUpdateName();
  return (
    <AccountChangeDialog
      title="Editar nome"
      person={person}
      currentLabel="Nome atual"
      currentValue={person.name ?? "Sem nome"}
      nextValue={field.name}
      isValueValid={field.isValid}
      invalidMessage="Digite um nome diferente do atual."
      onConfirm={(reason) => updateName.mutateAsync({ userId: person.userId, name: field.name, ...reason })}
      onClose={onClose}
      onSaved={onSaved}
      doneMessage={`Nome alterado para ${field.name}`}
    >
      <TextField label="Novo nome" autoComplete="off" value={field.value} onChange={(e) => field.setValue(e.target.value)} error={field.error} />
    </AccountChangeDialog>
  );
}
