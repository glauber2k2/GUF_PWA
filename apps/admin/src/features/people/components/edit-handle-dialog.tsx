"use client";

import type { AdminUserDetail } from "@guf/api/admin";
import { TextField } from "@guf/ui";
import { useUpdateHandle } from "@/features/people/api/use-people";
import { AccountChangeDialog } from "@/features/people/components/account-change-dialog";
import { useHandleField } from "@/features/people/hooks/use-handle-field";

interface EditHandleDialogProps {
  person: AdminUserDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** 5b · Editar o @ de uma pessoa (com motivo; a pessoa recebe um aviso no app). */
export function EditHandleDialog({ person, onClose, onSaved }: EditHandleDialogProps) {
  const field = useHandleField(person.userId);
  const updateHandle = useUpdateHandle();
  return (
    <AccountChangeDialog
      title="Editar @"
      person={person}
      currentLabel="@ atual"
      currentValue={person.handle ? `@${person.handle}` : "Sem @"}
      nextValue={`@${field.handle}`}
      isValueValid={field.isValid}
      invalidMessage="Digite um @ novo e disponível."
      onConfirm={(reason) => updateHandle.mutateAsync({ userId: person.userId, handle: field.handle, ...reason })}
      onClose={onClose}
      onSaved={onSaved}
      doneMessage={`@ alterado para @${field.handle}`}
    >
      <TextField label="Novo @" autoComplete="off" value={field.value} onChange={(e) => field.setValue(e.target.value)} error={field.error} hint={field.hint} />
    </AccountChangeDialog>
  );
}
