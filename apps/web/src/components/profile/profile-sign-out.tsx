"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Banner, Button, ConfirmDialog } from "@/components/ds";
import { useOutboxStatus } from "@/lib/offline/outbox";
import { useAuth } from "@/providers/auth-provider";

/**
 * "Sair da conta" (funciona sem internet). Com gravações de treino ainda não enviadas, pede
 * confirmação com "Ficar" e "Sair mesmo assim" de mesmo peso: sair apaga os dados do aparelho.
 */
export function ProfileSignOut({ forcePending = false }: { forcePending?: boolean }) {
  const { signOut } = useAuth();
  const outbox = useOutboxStatus();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setConfirming(false);
    setPending(true);
    setError(null);
    // Sucesso: o guarda de rota leva para /login.
    const failure = await signOut();
    if (failure) {
      setError(failure.message);
      setPending(false);
    }
  };

  const request = () => {
    if (forcePending || outbox.pending > 0) return setConfirming(true);
    void leave();
  };

  return (
    <div className="mt-2 flex flex-col gap-3">
      {error && <Banner tone="danger">{error}</Banner>}
      <Button variant="secondary" size="lg" icon={LogOut} fullWidth loading={pending} disabled={pending} onClick={request}>
        Sair da conta
      </Button>
      <ConfirmDialog
        placement="screen"
        balanced
        open={confirming}
        title="Sair da conta?"
        message="Você tem alterações de treino que ainda não foram enviadas. Saia depois de se conectar à internet para não perdê-las."
        cancelLabel="Ficar"
        confirmLabel="Sair mesmo assim"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void leave()}
      />
    </div>
  );
}
