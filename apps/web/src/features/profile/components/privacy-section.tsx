"use client";

import { useState, type ReactNode } from "react";
import { CircleCheck, Download, FileDown, HeartPulse, Mail, Trash2 } from "lucide-react";
import { DSAR_RESPONSE_DAYS, PRIVACY_CONTACT_EMAIL, privacyRequestMailto } from "@guf/core";
import type { Consents } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { Button, ConfirmDialog, GufLoader, Icon } from "@/shared/components/ds";
import { useRevokeHealthConsent } from "@/features/profile/api/use-profile";
import { DeleteAccountSheet } from "./delete-account-sheet";
import { ProfileSection, RowButton, RowGroup, RowIcon } from "./profile-ui";
import { useDataExport } from "@/features/profile/hooks/use-data-export";

type Overlay = "revoke" | "delete" | null;

/**
 * Conteúdo de Configurações › Privacidade, em grupos: perfil social (vindo da rota), seus dados
 * (exportar e outros pedidos), dados de saúde e a conta (excluir). Direitos do titular (LGPD).
 */
export function PrivacySection({ consents, canEdit, socialPrivacy }: { consents: Consents | undefined; canEdit: boolean; socialPrivacy?: ReactNode }) {
  const shell = useAppShell();
  const exporter = useDataExport(canEdit);
  const revoke = useRevokeHealthConsent();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = () => setOverlay(null);
  const health = consents?.healthConsent ?? false;

  const confirmRevoke = () => {
    close();
    revoke.mutate(undefined, {
      onSuccess: () => shell.showToast("Medidas apagadas e consentimento revogado", { tone: "success" }),
      onError: (e) => shell.showToast(e.message, { tone: "error" }),
    });
  };

  return (
    <>
      {socialPrivacy && (
        <ProfileSection id="pf-social" title="Perfil social" framed={false}>
          {socialPrivacy}
        </ProfileSection>
      )}

      <ProfileSection id="pf-data" title="Seus dados" className="[animation-delay:60ms]">
        <RowGroup first>
          <RowButton
            icon={FileDown}
            title="Exportar meus dados"
            subtitle={<span aria-live="polite">{exporter.subtitle}</span>}
            disabled={!canEdit || exporter.state.status !== "idle"}
            onClick={() => void exporter.start()}
            className="min-h-[60px]"
            trailing={exporter.state.status === "preparing" ? <GufLoader variant={2} size={24} label="Preparando arquivo" /> : exporter.state.status === "ready" ? <span /> : undefined}
          />
          {exporter.state.status === "ready" && (
            <div className="mx-2 mt-0.5 mb-2 ml-14 animate-guf-rise-fast">
              <Button icon={Download} onClick={exporter.download}>
                Baixar
              </Button>
            </div>
          )}
        </RowGroup>
        <RowGroup>
          {/* Canal para os demais pedidos do titular (art. 18): funciona sem internet (abre o app de e-mail). */}
          <RowButton
            icon={Mail}
            title="Outros pedidos sobre seus dados"
            subtitle={
              <>
                <span className="wrap-anywhere">{PRIVACY_CONTACT_EMAIL}</span> · resposta em até {DSAR_RESPONSE_DAYS} dias
              </>
            }
            onClick={() => window.location.assign(privacyRequestMailto())}
          />
        </RowGroup>
      </ProfileSection>

      <ProfileSection id="pf-health" title="Dados de saúde" className="[animation-delay:120ms]">
        <RowGroup first padded className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RowIcon icon={HeartPulse} />
            <span className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">
              Medidas corporais
            </span>
            {health ? (
              <span className="ml-auto flex h-[26px] flex-none items-center gap-1.5 rounded-pill bg-success/16 px-2.5 text-xs font-bold text-success">
                <Icon icon={CircleCheck} size={13} />
                Autorizado
              </span>
            ) : (
              <span className="ml-auto flex h-[26px] flex-none items-center rounded-pill bg-surface-3 px-2.5 text-xs font-bold text-fg-secondary">
                Não autorizado
              </span>
            )}
          </div>
          {!health && (
            <p className="m-0 pl-12 text-[13px] leading-[18px] text-pretty text-fg-muted">
              Para registrar suas medidas, abra o seu Perfil › Medidas corporais. A autorização é pedida lá, só se você quiser.
            </p>
          )}
          {health && (
            <div className="pl-12">
              <Button variant="outline" disabled={!canEdit || revoke.isPending} loading={revoke.isPending} onClick={() => setOverlay("revoke")} className="text-sm">
                Revogar consentimento
              </Button>
            </div>
          )}
        </RowGroup>
      </ProfileSection>

      <ProfileSection id="pf-account" title="Conta" className="[animation-delay:180ms]">
        <RowGroup first>
          <RowButton icon={Trash2} tone="danger" title="Excluir minha conta" disabled={!canEdit} onClick={() => setOverlay("delete")} />
        </RowGroup>
      </ProfileSection>

      <ConfirmDialog
        placement="screen"
        balanced
        open={overlay === "revoke"}
        title="Revogar e apagar suas medidas?"
        message="Todas as medidas corporais registradas serão apagadas. Não dá para desfazer."
        cancelLabel="Cancelar"
        confirmLabel="Revogar"
        onCancel={close}
        onConfirm={confirmRevoke}
      />
      <DeleteAccountSheet open={overlay === "delete"} exporter={exporter} onClose={close} />
    </>
  );
}
