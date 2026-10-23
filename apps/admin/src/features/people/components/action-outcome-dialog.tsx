"use client";

import { Button } from "@guf/ui";
import type { AccountActionOutcome } from "@/features/people/helpers/account-actions";
import { Dialog } from "@/shared/components/dialog";
import { Panel } from "@/shared/components/panel";

interface ActionOutcomeDialogProps {
  outcome: AccountActionOutcome;
  total: number;
  onClose: () => void;
}

/** Depois de uma ação com recusas: quem não mudou e por quê (a mensagem pronta de cada erro). */
export function ActionOutcomeDialog({ outcome, total, onClose }: ActionOutcomeDialogProps) {
  const noneChanged = outcome.succeeded.length === 0;
  return (
    <Dialog
      open
      title={noneChanged ? (total === 1 ? "A conta não mudou" : "Nenhuma conta mudou") : "Algumas contas não mudaram"}
      subtitle={`${outcome.succeeded.length} de ${total} concluídas · o motivo de cada uma está abaixo`}
      onClose={onClose}
      showClose
    >
      <Panel as="ul">
        {outcome.failed.map(({ target, message }) => (
          <li key={target.userId} className="flex flex-col gap-0.5 px-4 py-3">
            <strong className="text-sm">{target.label}</strong>
            <span className="text-[13px] text-fg-secondary">{message}</span>
          </li>
        ))}
      </Panel>
      <Button size="tall" fullWidth onClick={onClose}>
        Fechar
      </Button>
    </Dialog>
  );
}
