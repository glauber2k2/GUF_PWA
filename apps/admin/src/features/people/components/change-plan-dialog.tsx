"use client";

import type { AdminUserDetail } from "@guf/api/admin";
import { RadioGroup, TextField } from "@guf/ui";
import { useSetPlan } from "@/features/people/api/use-people";
import { AccountChangeDialog } from "@/features/people/components/account-change-dialog";
import { usePlanField } from "@/features/people/hooks/use-plan-field";

interface ChangePlanDialogProps {
  person: AdminUserDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** 5a · Mudar o plano manual de uma pessoa (assinatura paga não muda pelo painel). */
export function ChangePlanDialog({ person, onClose, onSaved }: ChangePlanDialogProps) {
  const field = usePlanField(person.plan.code);
  const setPlan = useSetPlan();
  return (
    <AccountChangeDialog
      title="Mudar plano"
      person={person}
      currentLabel="Plano atual"
      currentValue={person.plan.name}
      nextValue={field.label}
      isValueValid={field.isValid}
      invalidMessage="Escolha um plano diferente do atual ou uma validade."
      onConfirm={(reason) => setPlan.mutateAsync({ userId: person.userId, planCode: field.planCode, validUntil: field.validUntilIso, ...reason })}
      onClose={onClose}
      onSaved={onSaved}
      doneMessage={`Plano alterado para ${field.label}`}
    >
      <RadioGroup
        label="Novo plano"
        options={field.plans.map((p) => ({ value: p.code, label: p.code === person.plan.code ? `${p.name} (atual)` : p.name }))}
        value={field.planCode}
        onChange={field.setPlanCode}
      />
      {field.showValidUntil && (
        <TextField
          label="Válido até (opcional)"
          type="date"
          value={field.validUntil}
          onChange={(e) => field.setValidUntil(e.target.value)}
          hint="Em branco = sem data para acabar. Depois da data, a pessoa volta para o plano padrão."
        />
      )}
    </AccountChangeDialog>
  );
}
