"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ScrollText } from "lucide-react";
import type { AdminUserDetail } from "@guf/api/admin";
import { Banner, Button, Icon, RadioGroup, TextField } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { ReasonFields } from "@/features/people/components/reason-fields";
import { displayName } from "@/features/people/helpers/people";
import { useAccountEdit, type EditField } from "@/features/people/hooks/use-account-edit";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { Panel } from "@/shared/components/panel";

interface EditAccountDialogProps {
  person: AdminUserDetail;
  /** Campo que recebe o foco ao abrir (o botão tocado). */
  initialField: EditField;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * 5a–5e · Editar plano, @ e nome no mesmo formulário: só o que mudar é enviado (um motivo vale para
 * todos), com o resumo de cada mudança antes de confirmar.
 */
export function EditAccountDialog({ person, initialField, onClose, onSaved }: EditAccountDialogProps) {
  const { can } = useStaff();
  const allowedFields: EditField[] = [...(can("edit_profile") ? (["handle", "name"] as const) : []), ...(can("change_plan") ? (["plan"] as const) : [])];
  const edit = useAccountEdit(person, allowedFields, (message) => {
    onSaved(message);
    onClose();
  });
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Depois do foco inicial do Dialog (no primeiro botão), que roda no mesmo ciclo.
    const frame = requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-edit-field="${initialField}"] input`)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [initialField]);

  return (
    <Dialog open title="Editar conta" subtitle={`${displayName(person.name, person.handle)}${person.handle ? ` · @${person.handle}` : ""}`} onClose={onClose} showClose>
      {edit.stage === "form" ? (
        <div ref={formRef} className="flex flex-col gap-5">
          {edit.allows("handle") && (
            <div data-edit-field="handle">
              <TextField
                label="Novo @ (opcional)"
                autoComplete="off"
                value={edit.handle}
                onChange={(e) => edit.setHandle(e.target.value)}
                error={edit.handleError}
                hint={edit.handleHint ?? (person.handle ? `Atual: @${person.handle}. Em branco = não muda.` : "Em branco = não muda.")}
              />
            </div>
          )}
          {edit.allows("name") && (
            <div data-edit-field="name">
              <TextField label="Nome" autoComplete="off" value={edit.name} onChange={(e) => edit.setName(e.target.value)} error={edit.nameError} />
            </div>
          )}
          {edit.allows("plan") && (
            <div data-edit-field="plan" className="flex flex-col gap-3">
              <RadioGroup
                label="Plano"
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
            </div>
          )}
          {edit.showNoChangeError && (
            <span role="alert" className="flex gap-1.5 text-[13px] text-danger">
              <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
              Altere pelo menos um campo: @, nome ou plano.
            </span>
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
        </div>
      ) : (
        <>
          <Panel as="dl">
            {edit.changes.map((change) => (
              <div key={change.field} className="grid grid-cols-[90px_1fr] gap-3 px-4 py-3">
                <dt className="flex items-center gap-1.5 text-fg-secondary">
                  {change.label}
                  {edit.saved.includes(change.field) && <Icon icon={Check} size={14} label="Salvo" className="text-success" />}
                </dt>
                <dd className="m-0 flex flex-wrap items-center gap-x-2 break-words">
                  <span className="text-fg-muted line-through">{change.before}</span>
                  <Icon icon={ArrowRight} size={14} className="text-fg-muted" />
                  <strong>{change.after}</strong>
                </dd>
              </div>
            ))}
            {[
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
            As mudanças valem na hora, a pessoa recebe um aviso no app e cada uma fica registrada na auditoria com seu nome.
          </span>
          {edit.saveError && (
            <Banner tone="danger" title={`Não foi possível salvar: ${edit.saveError.label}`}>
              {edit.saveError.message}
              {edit.saved.length > 0 ? " As marcadas como salvas já foram gravadas; tentar de novo envia só o resto." : ""}
            </Banner>
          )}
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth icon={ArrowLeft} onClick={edit.backToForm} disabled={edit.isSaving}>
              Voltar
            </Button>
            <Button size="tall" fullWidth loading={edit.isSaving} onClick={edit.confirm}>
              {edit.saveError ? "Tentar de novo" : edit.changes.length > 1 ? `Confirmar ${edit.changes.length} mudanças` : "Confirmar"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
