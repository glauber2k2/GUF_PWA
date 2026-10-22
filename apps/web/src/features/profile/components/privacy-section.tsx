"use client";

import { useState, type ReactNode } from "react";
import { CircleCheck, Download, FileCheck, FileDown, FileText, HeartPulse, Mail, Trash2 } from "lucide-react";
import { acceptedLabel, DSAR_RESPONSE_DAYS, LEGAL_DOC_TITLES, legalReaderTarget, PRIVACY_CONTACT_EMAIL, privacyRequestMailto } from "@guf/core";
import type { Consents } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { BottomSheet, Button, ConfirmDialog, GufLoader, Icon } from "@/shared/components/ds";
import { useLegalReader } from "@/features/legal";
import { useRevokeHealthConsent } from "@/features/profile/api/use-profile";
import { DeleteAccountSheet } from "./delete-account-sheet";
import { ProfileSection, RowButton, RowGroup, RowIcon } from "./profile-ui";
import { useDataExport } from "@/features/profile/hooks/use-data-export";

type Overlay = "docs" | "revoke" | "delete" | null;

/**
 * Perfil social (visibilidade e histórico, vindo da rota), exportar dados, documentos aceitos,
 * consentimento de saúde e excluir conta (LGPD).
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
    <ProfileSection id="pf-privacy" title="Privacidade" className="[animation-delay:150ms]">
      {socialPrivacy}
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
        <RowButton icon={FileCheck} title="Documentos aceitos" onClick={() => setOverlay("docs")} />
      </RowGroup>

      <RowGroup>
        {/* Canal para os demais pedidos do titular (art. 18): funciona sem internet (abre o app de e-mail). */}
        <RowButton
          icon={Mail}
          title="Outros pedidos sobre seus dados"
          subtitle={<><span className="wrap-anywhere">{PRIVACY_CONTACT_EMAIL}</span> · resposta em até {DSAR_RESPONSE_DAYS} dias</>}
          onClick={() => window.location.assign(privacyRequestMailto())}
        />
      </RowGroup>

      <RowGroup padded className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <RowIcon icon={HeartPulse} />
          <span className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">
            Dados de saúde <span className="font-normal text-fg-secondary">(medidas corporais)</span>
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

      <RowGroup>
        <RowButton icon={Trash2} tone="danger" title="Excluir minha conta" disabled={!canEdit} onClick={() => setOverlay("delete")} />
      </RowGroup>

      <DocumentsSheet open={overlay === "docs"} consents={consents} onClose={close} />
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
    </ProfileSection>
  );
}

function DocumentsSheet({ open, consents, onClose }: { open: boolean; consents: Consents | undefined; onClose: () => void }) {
  const documents = consents?.documents ?? [];
  const { openLegal } = useLegalReader();
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Documentos aceitos">
      <div className="flex flex-col gap-2">
        {documents.length === 0 && <p className="m-0 text-sm text-fg-secondary">Nenhum documento aceito encontrado.</p>}
        {documents.map((doc) => {
          const title = LEGAL_DOC_TITLES[doc.docType];
          return (
            <div key={doc.docType} className="flex min-h-16 items-center gap-3 rounded-[14px] border border-border bg-surface py-2.5 pr-2 pl-3.5">
              <Icon icon={FileText} size={20} className="text-fg-secondary" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-5 font-semibold">{title}</span>
                <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{acceptedLabel(doc.docType, doc.acceptedAt, doc.version)}</span>
              </span>
              <a
                href={doc.url}
                onClick={(e) => {
                  e.preventDefault();
                  // A folha fica acima do leitor: fecha antes de abrir o documento.
                  onClose();
                  const target = legalReaderTarget(doc.docType);
                  if (target) openLegal(target.doc, target.anchor);
                }}
                aria-label={`Ler ${title}`}
                className="flex h-11 min-w-11 items-center justify-center rounded-md px-2.5 text-sm font-semibold text-accent-text hover:bg-surface-3"
              >
                Ler
              </a>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
