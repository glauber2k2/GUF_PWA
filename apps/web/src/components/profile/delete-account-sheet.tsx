"use client";

import { useState } from "react";
import { Download, FileDown, Trash2, TriangleAlert } from "lucide-react";
import { DELETE_ACCOUNT_WORD, isDeleteConfirmation } from "@guf/core";
import { signOut } from "@guf/api";
import { useAppShell } from "@/components/app-shell/app-shell";
import { Banner, BottomSheet, Button, GufLoader, Icon, TextField } from "@/components/ds";
import { useProfileSource } from "@/hooks/use-profile";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { DataExportApi } from "./use-data-export";

/** Destino depois de excluir a conta: o login mostra "Sua conta foi excluída." */
export const ACCOUNT_DELETED_PATH = "/login/?conta-excluida=1";

/**
 * Excluir minha conta: aviso do que será apagado, atalho para exportar antes e confirmação
 * digitando EXCLUIR. Exclui pela Edge Function delete-account, sai da conta e vai para o login.
 * No mock (desenvolvimento), apenas simula — nunca chama a exclusão real.
 */
export function DeleteAccountSheet({ open, exporter, onClose }: { open: boolean; exporter: DataExportApi; onClose: () => void }) {
  const { api, mock } = useProfileSource();
  const shell = useAppShell();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao abrir, começa do zero (ajuste durante a renderização, sem efeito).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setError(null);
    }
  }

  const confirmed = isDeleteConfirmation(text);
  const close = () => {
    // Durante a exclusão a folha não fecha.
    if (!busy) onClose();
  };

  const remove = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    const { error: failure } = await api.deleteAccount(getSupabaseClient());
    if (failure) {
      setBusy(false);
      return setError(failure.message);
    }
    if (mock) {
      setBusy(false);
      onClose();
      return shell.showToast("Simulação: a conta seria excluída e você voltaria ao login.", { tone: "info" });
    }
    // A conta já não existe: sai sem enviar a fila offline (o SIGNED_OUT limpa os dados do aparelho).
    await signOut(getSupabaseClient());
    window.location.replace(ACCOUNT_DELETED_PATH);
  };

  const exporting = exporter.state.status !== "idle";
  return (
    <BottomSheet placement="screen" open={open} onClose={close} title="Excluir minha conta" className="max-h-[90dvh] overflow-y-auto">
      {busy ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
          <GufLoader variant={2} size={64} label="Excluindo sua conta" />
          <span className="text-base font-semibold">Excluindo sua conta…</span>
          <span className="text-sm leading-5 text-fg-secondary">Não feche o app.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-[14px] border border-danger/40 bg-banner-danger p-3.5">
            <Icon icon={TriangleAlert} size={20} className="mt-px text-danger" />
            <span className="text-sm leading-5 text-pretty">
              Seus treinos, rotinas, projetos e medidas serão apagados para sempre. Antes, você pode exportar seus dados.
            </span>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void exporter.start()}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-surface px-3 py-2 text-left text-fg hover:bg-surface-3 disabled:cursor-default disabled:hover:bg-surface"
          >
            <Icon icon={FileDown} size={20} className="text-fg-secondary" />
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">Exportar meus dados</span>
              <span aria-live="polite" className="text-[13px] text-fg-secondary tabular-nums">
                {exporter.subtitle}
              </span>
            </span>
            {exporter.state.status === "preparing" && <GufLoader variant={2} size={22} label="Preparando arquivo" />}
          </button>
          {exporter.state.status === "ready" && (
            <Button icon={Download} onClick={exporter.download} className="-mt-2 self-start">
              Baixar
            </Button>
          )}
          {error && <Banner tone="danger">{error}</Banner>}
          <TextField
            label={`Digite ${DELETE_ACCOUNT_WORD} para confirmar`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            disabled={!confirmed}
            onClick={() => void remove()}
            className={cn(
              "flex h-[52px] items-center justify-center gap-2 rounded-md text-base font-bold transition-colors duration-150 ease-standard",
              confirmed ? "cursor-pointer bg-danger text-danger-foreground" : "cursor-not-allowed bg-surface-3 text-fg-muted",
            )}
          >
            <Icon icon={Trash2} size={18} />
            Excluir conta
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
