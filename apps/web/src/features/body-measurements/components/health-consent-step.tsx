"use client";

import { useState } from "react";
import { FileText, HeartPulse } from "lucide-react";
import { LEGAL_DOCUMENTS } from "@guf/core";
import { Banner, Button, Checkbox, Icon } from "@/shared/components/ds";
import { LegalSummary, useLegalReader } from "@/features/legal";

const HEALTH_TERM = LEGAL_DOCUMENTS.saude;

interface HealthConsentStepProps {
  canUse: boolean;
  isGranting: boolean;
  error: string | null;
  onDecline: () => void;
  onGrant: () => void;
}

/**
 * Consentimento de saúde em camadas (LGPD art. 11, I): resumo sempre visível, termo completo no
 * leitor, caixa desmarcada e "Agora não" com o mesmo peso de "Autorizar e continuar". Pedido só
 * quando a pessoa entra nas medidas; o resto do app funciona sem ele.
 */
export function HealthConsentStep({ canUse, isGranting, error, onDecline, onGrant }: HealthConsentStepProps) {
  const { openLegal } = useLegalReader();
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-md bg-accent-tile text-accent-text">
          <Icon icon={HeartPulse} size={22} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-lg leading-6 font-semibold tracking-[-0.01em]">Antes de registrar suas medidas</h2>
          <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">
            Medidas corporais são dados de saúde. Para guardá-las, o guf precisa da sua autorização específica.
          </p>
        </div>
      </div>

      <LegalSummary items={HEALTH_TERM.summary} id="medidas-resumo" note={false}>
        <Button variant="ghost" icon={FileText} onClick={() => openLegal("saude")} className="self-start">
          Ler termo completo
        </Button>
      </LegalSummary>

      <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} disabled={!canUse || isGranting}>
        Autorizo o guf a guardar minhas medidas corporais para acompanhar minha evolução, conforme o Termo de Consentimento para Dados de Saúde.
      </Checkbox>

      {error && <Banner tone="danger">{error}</Banner>}

      {/* Um embaixo do outro, em largura total: lado a lado, "Autorizar e continuar" (mais o carregando) não cabia no celular. */}
      <div className="flex flex-col gap-2.5">
        <Button variant="secondary" size="lg" fullWidth onClick={onDecline} disabled={isGranting}>
          Agora não
        </Button>
        <Button variant="secondary" size="lg" fullWidth disabled={!checked || !canUse} loading={isGranting} onClick={onGrant}>
          Autorizar e continuar
        </Button>
      </div>
      <p className="m-0 text-[13px] leading-[18px] text-pretty text-fg-muted">
        Você pode revogar quando quiser em Configurações › Privacidade. Revogar apaga todas as medidas.
      </p>
    </div>
  );
}
