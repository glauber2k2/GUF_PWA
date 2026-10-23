"use client";

import { useState } from "react";
import { CircleAlert, ScrollText } from "lucide-react";
import { BAN_DURATIONS, type BanDuration } from "@guf/core";
import { Banner, Button, Checkbox, Icon, RadioGroup, SegmentedControl, TextAreaField, TextField } from "@guf/ui";
import { useAccountActionRunner } from "@/features/people/api/use-account-actions";
import { ActionOutcomeDialog } from "@/features/people/components/action-outcome-dialog";
import { ReasonFields } from "@/features/people/components/reason-fields";
import {
  ACCOUNT_ACTIONS,
  DELETE_CONFIRM_WORD,
  isRiskyAction,
  type AccountActionKind,
  type AccountActionOutcome,
  type AccountTarget,
} from "@/features/people/helpers/account-actions";
import { useAccountActionForm } from "@/features/people/hooks/use-account-action-form";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface AccountActionDialogProps {
  kind: AccountActionKind;
  targets: AccountTarget[];
  onClose: () => void;
  /** Chamado quando ao menos uma conta foi alterada (a tela mostra o aviso e limpa a seleção). */
  onDone: (outcome: AccountActionOutcome, message: string) => void;
}

const BAN_OPTIONS = (Object.keys(BAN_DURATIONS) as BanDuration[]).map((value) => ({ value, label: BAN_DURATIONS[value].label }));

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="flex gap-1.5 text-[13px] text-danger">
      <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
      {message}
    </span>
  );
}

/**
 * Ação de conta para uma pessoa (menu do detalhe) ou várias (seleção em Pessoas). Cada conta vai ao
 * banco separada; no fim mostra quem não mudou e por quê.
 */
export function AccountActionDialog({ kind, targets, onClose, onDone }: AccountActionDialogProps) {
  const meta = ACCOUNT_ACTIONS[kind];
  const form = useAccountActionForm(kind);
  const runner = useAccountActionRunner();
  const [outcome, setOutcome] = useState<AccountActionOutcome | null>(null);
  const subtitle = targets.length === 1 ? targets[0]?.label : `${targets.length} pessoas selecionadas`;

  const confirm = async () => {
    const input = form.submit();
    if (!input) return;
    const result = await runner.run(input, targets);
    if (result.succeeded.length > 0) onDone(result, meta.done(result.succeeded.length));
    if (result.failed.length === 0) onClose();
    else setOutcome(result);
  };

  if (outcome) return <ActionOutcomeDialog outcome={outcome} total={targets.length} onClose={onClose} />;

  return (
    <Dialog open title={meta.title(targets.length)} subtitle={subtitle} onClose={runner.isRunning ? () => undefined : onClose} showClose={!runner.isRunning}>
      <p className="m-0 text-pretty text-fg-secondary">{meta.consequence}</p>

      {kind === "plan" && (
        <div className="flex flex-col gap-3">
          <RadioGroup label="Novo plano" options={form.plans.map((p) => ({ value: p.code, label: p.name }))} value={form.planCode} onChange={form.setPlanCode} />
          {form.showValidUntil && (
            <TextField
              label="Válido até (opcional)"
              type="date"
              value={form.validUntil}
              onChange={(e) => form.setValidUntil(e.target.value)}
              hint="Em branco = sem data para acabar."
            />
          )}
          <FieldError message={form.errors.plan} />
        </div>
      )}

      {kind === "ban" && (
        <SegmentedControl options={BAN_OPTIONS} value={form.banDuration} onChange={(v) => form.setBanDuration(v as BanDuration)} label="Por quanto tempo" />
      )}

      {form.needsDate && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2.5">
            <TextField label={kind === "ban" ? "Suspensa até" : "Excluir em"} type="date" value={form.date} onChange={(e) => form.setDate(e.target.value)} />
            <TextField label="Hora (Brasília)" type="time" value={form.time} onChange={(e) => form.setTime(e.target.value)} />
          </div>
          <FieldError message={form.errors.date} />
        </div>
      )}

      {kind === "unlink_social" && (
        <>
          <div className="rounded-md border border-border-strong p-3.5">
            <Checkbox checked={form.isConfirmed} onChange={(e) => form.setConfirmed(e.target.checked)}>
              {targets.length === 1 ? "Pedido confirmado pela pessoa (identidade conferida)" : "Pedidos confirmados por cada pessoa (identidade conferida)"}
            </Checkbox>
          </div>
          <TextAreaField label="Observação (opcional)" rows={2} maxLength={200} value={form.note} onChange={(e) => form.setNote(e.target.value)} hint="Sem dados pessoais." />
          <FieldError message={form.errors.confirm} />
        </>
      )}

      {form.needsReason && (
        <ReasonFields reason={form.reason} note={form.note} onReason={form.setReason} onNote={form.setNote} showError={Boolean(form.errors.reason)} />
      )}

      {kind === "delete" && (
        <div className="flex flex-col gap-2">
          <TextField
            label={`Digite ${DELETE_CONFIRM_WORD} para confirmar`}
            autoComplete="off"
            value={form.confirmWord}
            onChange={(e) => form.setConfirmWord(e.target.value)}
          />
          <FieldError message={form.errors.confirm} />
        </div>
      )}

      <span className="flex items-start gap-2 text-[13px] text-fg-secondary">
        <Icon icon={ScrollText} size={15} className="mt-0.5 flex-none" />
        Cada conta fica registrada na auditoria com seu nome e o motivo.
      </span>
      {runner.progress && targets.length > 1 && (
        <Banner tone="info">
          Aplicando… {runner.progress.done} de {runner.progress.total}
        </Banner>
      )}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose} disabled={runner.isRunning}>
          Cancelar
        </Button>
        <Button variant={isRiskyAction(kind) ? "danger" : "primary"} size="tall" fullWidth loading={runner.isRunning} onClick={() => void confirm()}>
          {meta.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
