"use client";

import { Eye } from "lucide-react";
import { Banner, Button } from "@guf/ui";
import { useRevealEmail } from "@/features/people/api/use-people";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface RevealEmailDialogProps {
  userId: string;
  onClose: () => void;
  onRevealed: (email: string) => void;
}

/** 5f · Mostrar o e-mail completo: ação registrada na auditoria (necessidade, Art. 6º, III). */
export function RevealEmailDialog({ userId, onClose, onRevealed }: RevealEmailDialogProps) {
  const reveal = useRevealEmail();
  const confirm = () =>
    reveal.mutate(userId, {
      onSuccess: (email) => {
        onRevealed(email);
        onClose();
      },
    });

  return (
    <Dialog open title="Mostrar e-mail?" onClose={onClose}>
      <p className="m-0 text-pretty text-fg-secondary">
        O acesso fica registrado na auditoria com seu nome, data e hora. Mostre só quando precisar para atender a pessoa.
      </p>
      {reveal.error && <Banner tone="danger">{reveal.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="secondary" size="tall" icon={Eye} fullWidth loading={reveal.isPending} onClick={confirm}>
          Mostrar e-mail
        </Button>
      </DialogActions>
    </Dialog>
  );
}
