"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, ScrollText } from "lucide-react";
import type { ApiError } from "@guf/api";
import type { AdminUserDetail } from "@guf/api/admin";
import { describeReason, isConfirmationTyped, isReasonComplete, type ChangeReason } from "@guf/core";
import { Banner, Button, Icon } from "@guf/ui";
import { ConfirmationWordField } from "@/features/people/components/confirmation-word-field";
import { ReasonFields } from "@/features/people/components/reason-fields";
import { displayName } from "@/features/people/helpers/people";
import { Dialog, DialogActions } from "@/shared/components/dialog";
import { Panel } from "@/shared/components/panel";

interface AccountChangeDialogProps {
  title: string;
  person: AdminUserDetail;
  /** Rótulo e valor atual ("@ atual" · "@marina"). */
  currentLabel: string;
  currentValue: string;
  /** Valor novo como aparece no resumo. */
  nextValue: string;
  /** O campo do valor novo (cada diálogo traz o seu). */
  children: ReactNode;
  /** Valor novo pronto para revisar (diferente do atual e válido). */
  isValueValid: boolean;
  /** Mostrado depois de tentar revisar com o valor inválido (o campo pode ter erros próprios). */
  invalidMessage?: string;
  /** Grava a mudança; rejeita com o ApiError (a mensagem aparece no resumo). */
  onConfirm: (reason: { reason: ChangeReason; note: string }) => Promise<unknown>;
  onClose: () => void;
  onSaved: (message: string) => void;
  /** Aviso de sucesso. */
  doneMessage: string;
  /** Palavra a digitar na revisão antes de confirmar (mudança sensível, ex.: plano). */
  confirmationWord?: string;
  /** Texto abaixo do resumo (o que acontece ao confirmar). */
  reviewNotice?: string;
}

const DEFAULT_REVIEW_NOTICE = "A mudança vale na hora, a pessoa recebe um aviso no app e fica registrada na auditoria com seu nome.";

/**
 * Moldura comum de "Editar @", "Editar nome" e "Mudar plano" (protótipo 5a–5e): valor novo, motivo
 * obrigatório e resumo antes de confirmar. Cada diálogo cuida só do próprio campo e da gravação.
 */
export function AccountChangeDialog({
  title,
  person,
  currentLabel,
  currentValue,
  nextValue,
  children,
  isValueValid,
  invalidMessage,
  onConfirm,
  onClose,
  onSaved,
  doneMessage,
  confirmationWord,
  reviewNotice = DEFAULT_REVIEW_NOTICE,
}: AccountChangeDialogProps) {
  const [stage, setStage] = useState<"form" | "review">("form");
  const [reason, setReason] = useState<ChangeReason | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [typedWord, setTypedWord] = useState("");
  const [triedConfirm, setTriedConfirm] = useState(false);
  const isWordTyped = !confirmationWord || isConfirmationTyped(typedWord, confirmationWord);
  const isReasonValid = isReasonComplete(reason, note);

  const toReview = () => {
    setTried(true);
    if (isValueValid && isReasonValid) setStage("review");
  };

  const confirm = async () => {
    setTriedConfirm(true);
    if (!reason || !isWordTyped) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onConfirm({ reason, note });
      onSaved(doneMessage);
      onClose();
    } catch (error) {
      setSaveError(error as ApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open title={title} subtitle={`${displayName(person.name, person.handle)}${person.handle ? ` · @${person.handle}` : ""}`} onClose={onClose} showClose stepKey={stage}>
      {stage === "form" ? (
        <>
          <div className="flex flex-col gap-1 rounded-md bg-surface-3 px-3.5 py-3">
            <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">{currentLabel}</span>
            <strong className="text-base">{currentValue}</strong>
          </div>
          {children}
          {tried && !isValueValid && invalidMessage && (
            <span role="alert" className="flex gap-1.5 text-[13px] text-danger">
              <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
              {invalidMessage}
            </span>
          )}
          <ReasonFields reason={reason} note={note} onReason={setReason} onNote={setNote} showError={tried && !isReasonValid} />
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
              Cancelar
            </Button>
            <Button size="tall" fullWidth iconRight={ArrowRight} onClick={toReview}>
              Revisar
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <Panel as="dl">
            {[
              { label: "Antes", value: <span className="text-fg-muted line-through">{currentValue}</span> },
              { label: "Depois", value: <strong>{nextValue}</strong> },
              { label: "Motivo", value: describeReason(reason, note) },
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
            {reviewNotice}
          </span>
          {confirmationWord && (
            <ConfirmationWordField
              word={confirmationWord}
              value={typedWord}
              onChange={setTypedWord}
              error={triedConfirm && !isWordTyped ? `Digite ${confirmationWord} para confirmar.` : undefined}
            />
          )}
          {saveError && <Banner tone="danger">{saveError.message}</Banner>}
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth icon={ArrowLeft} onClick={() => setStage("form")} disabled={isSaving}>
              Voltar
            </Button>
            <Button size="tall" fullWidth loading={isSaving} onClick={() => void confirm()}>
              Confirmar
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
