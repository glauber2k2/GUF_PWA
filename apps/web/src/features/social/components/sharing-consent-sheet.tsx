"use client";

import { useState } from "react";
import { LEGAL_DOCUMENTS } from "@guf/core";
import { BottomSheet, Button, Checkbox } from "@/shared/components/ds";
import { LegalDocLink, LegalSummary } from "@/features/legal";
import { useAppShell } from "@/features/app-shell";
import { useGrantSharingConsent } from "@/features/social/api/use-social";

const SHARING = LEGAL_DOCUMENTS.compartilhamento;

/**
 * Consentimento para compartilhar treinos (LGPD, em camadas): resumo sempre visível, termo
 * completo no leitor, caixa desmarcada e "Agora não" / "Autorizar e continuar" com o mesmo peso.
 * Pedido só quando algo vai ser compartilhado (aceitar seguidor ou abrir o perfil).
 */
export function SharingConsentSheet({ open, onClose, onGranted }: { open: boolean; onClose: () => void; onGranted: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const grant = useGrantSharingConsent();
  const { showToast } = useAppShell();

  const close = () => {
    setAgreed(false);
    onClose();
  };

  const authorize = () =>
    grant.mutate(undefined, {
      onSuccess: () => {
        setAgreed(false);
        onGranted();
      },
      onError: (error) => showToast(error.message, { tone: "error" }),
    });

  return (
    <BottomSheet placement="screen" open={open} onClose={close} title="Compartilhar seus treinos">
      <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto">
        <LegalSummary items={SHARING.summary} id="compartilhar-resumo" note={false} />
        <LegalDocLink docType="social_sharing" url={SHARING.route} className="self-start text-sm font-semibold text-accent-text">
          Ler termo completo
        </LegalDocLink>
        <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
          Li e autorizo o compartilhamento dos meus treinos conforme o termo.
        </Checkbox>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="tall" onClick={close}>
            Agora não
          </Button>
          <Button variant="secondary" size="tall" disabled={!agreed} loading={grant.isPending} onClick={authorize}>
            Autorizar e continuar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
