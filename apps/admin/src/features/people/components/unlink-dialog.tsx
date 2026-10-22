"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { AdminUserDetail } from "@guf/api/admin";
import { loginProviderLabel } from "@guf/core";
import { Banner, Button, Checkbox, TextAreaField } from "@guf/ui";
import { useUnlinkLogin } from "@/features/people/api/use-people";
import { displayName } from "@/features/people/helpers/people";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface UnlinkDialogProps {
  person: AdminUserDetail;
  provider: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** O que sobra para entrar sem este login (mesma regra do banco, GA006). */
function remainingLogins(person: AdminUserDetail, provider: string) {
  return person.logins.filter((l) => l.provider !== provider && (l.provider !== "email" || person.hasPassword));
}

/** 6a–6d · Desvincular login social: só a pedido da pessoa; bloqueado se for o único jeito de entrar. */
export function UnlinkDialog({ person, provider, onClose, onDone }: UnlinkDialogProps) {
  const unlink = useUnlinkLogin();
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const label = loginProviderLabel(provider);
  const name = displayName(person.name, person.handle);
  const isBlocked = remainingLogins(person, provider).length === 0;

  const submit = () =>
    unlink.mutate(
      { userId: person.userId, provider, note },
      {
        onSuccess: () => {
          onDone(`${label} desvinculado. A pessoa entra pelos outros logins.`);
          onClose();
        },
      },
    );

  return (
    <Dialog open title={`Desvincular ${label}?`} onClose={onClose}>
      {isBlocked ? (
        <>
          <Banner tone="danger" icon={Lock} title="Esta pessoa ficaria sem acesso.">
            O {label} é o único jeito de {name} entrar. Peça para a pessoa criar uma senha antes.
          </Banner>
          <p className="m-0 text-[13px] text-fg-secondary">Depois disso, o {label} pode ser desvinculado aqui.</p>
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
              Entendi
            </Button>
            <Button variant="danger" size="tall" fullWidth disabled>
              Desvincular
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <p className="m-0 text-pretty text-fg-secondary">
            {name} não vai mais conseguir entrar com o {label}. Continua entrando pelos outros logins. Os treinos e o histórico não mudam.
          </p>
          <div className="rounded-md border border-border-strong p-3.5">
            <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
              Pedido confirmado pela pessoa (identidade conferida)
            </Checkbox>
          </div>
          <TextAreaField label="Observação (opcional)" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} hint="Ex.: confirmou por e-mail. Sem dados pessoais." />
          {unlink.error && <Banner tone="danger">{unlink.error.message}</Banner>}
          <DialogActions>
            <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" size="tall" fullWidth disabled={!confirmed} loading={unlink.isPending} onClick={submit}>
              Desvincular
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
