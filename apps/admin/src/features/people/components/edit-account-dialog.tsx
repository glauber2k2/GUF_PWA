"use client";

import { ArrowLeft, ArrowRight, ScrollText } from "lucide-react";
import type { AdminUserDetail } from "@guf/api/admin";
import { Banner, Button, Icon, RadioGroup, SegmentedControl, TextField } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { ReasonFields } from "@/features/people/components/reason-fields";
import { displayName } from "@/features/people/helpers/people";
import { useAccountEdit, type EditField } from "@/features/people/hooks/use-account-edit";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { Panel } from "@/shared/components/panel";

interface EditAccountDialogProps {
  person: AdminUserDetail;
  initialField: EditField;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** 5a–5e · Editar plano, @ ou nome: valor novo validado, motivo e resumo antes de confirmar. */
export function EditAccountDialog({ person, initialField, onClose, onSaved }: EditAccountDialogProps) {
  const { can } = useStaff();
  const edit = useAccountEdit(person, initialField, (message) => {
    onSaved(message);
    onClose();
  });
  const fieldOptions = [
    ...(can("change_plan") ? [{ value: "plan", label: "Plano" }] : []),
    ...(can("edit_profile") ? [{ value: "handle", label: "@" }, { value: "name", label: "Nome" }] : []),
  ];

  return (
    <Dialog open title="Editar conta" subtitle={`${displayName(person.name, person.handle)}${person.handle ? ` · @${person.handle}` : ""}`} onClose={onClose} showClose>
      {edit.stage === "form" ? (
        <>
          {fieldOptions.length > 1 && (
            <SegmentedControl options={fieldOptions} value={edit.field} onChange={(v) => edit.setField(v as EditField)} label="O que editar" />
          )}
          <div className="flex flex-col gap-1 rounded-md bg-surface-3 px-3.5 py-3">
            <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">{edit.fieldLabel} atual</span>
            <strong className="text-base">{edit.currentValue}</strong>
          </div>
          {edit.field === "handle" && (
            <TextField
              label="Novo @"
              autoComplete="off"
              value={edit.handle}
              onChange={(e) => edit.setHandle(e.target.value)}
              error={edit.handleError}
              hint={edit.handleHint}
            />
          )}
          {edit.field === "name" && <TextField label="Novo nome" autoComplete="off" value={edit.name} onChange={(e) => edit.setName(e.target.value)} error={edit.nameError} />}
          {edit.field === "plan" && (
            <>
              <RadioGroup
                label="Novo plano"
                options={edit.plans.map((p) => ({ value: p.code, label: p.code === person.plan.code ? `${p.name} (atual)` : p.name }))}
                value={edit.planCode}
                onChange={edit.setPlanCode}
              />
              {edit.showValidUntil && (
                <TextField
                  label="Válido até (opcional)"
                  type="date"
                  value={edit.validUntil}
                  onChange={(e) => edit.setValidUntil(e.target.value)}
                  hint="Em branco = sem data para acabar. Depois da data, a pessoa volta para o plano padrão."
                />
              )}
              {edit.showPlanError && <span role="alert" className="text-[13px] text-danger">Escolha um plano diferente do atual ou uma validade.</span>}
            </>
          )}
          <ReasonFields reason={edit.reason} note={edit.note} onReason={edit.setReason} onNote={edit.setNote} showError={edit.showReasonError} />
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
              Cancelar
            </Button>
            <Button size="tall" fullWidth iconRight={ArrowRight} onClick={edit.toReview}>
              Revisar
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <Panel as="dl">
            {[
              { label: "Antes", value: <span className="text-fg-muted line-through">{edit.currentValue}</span> },
              { label: "Depois", value: <strong>{edit.nextValue}</strong> },
              { label: "Motivo", value: edit.reasonText },
              { label: "Pessoa", value: `${displayName(person.name, person.handle)} · ${person.userId}` },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[90px_1fr] gap-3 px-4 py-3">
                <dt className="text-fg-secondary">{row.label}</dt>
                <dd className="m-0 break-words">{row.value}</dd>
              </div>
            ))}
          </Panel>
          <span className="flex items-start gap-2 text-[13px] text-fg-secondary">
            <Icon icon={ScrollText} size={15} className="mt-0.5 flex-none" />
            A mudança vale na hora, a pessoa recebe um aviso no app e fica registrada na auditoria com seu nome.
          </span>
          {edit.saveError && <Banner tone="danger">{edit.saveError.message}</Banner>}
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth icon={ArrowLeft} onClick={edit.backToForm}>
              Voltar
            </Button>
            <Button size="tall" fullWidth loading={edit.isSaving} onClick={edit.confirm}>
              Confirmar
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
