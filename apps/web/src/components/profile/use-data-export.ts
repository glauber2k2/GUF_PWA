"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { exportFileName, formatFileSize } from "@guf/core";
import { useAppShell } from "@/components/app-shell/app-shell";
import { useProfileSource } from "@/hooks/use-profile";
import { getSupabaseClient } from "@/lib/supabase";

export type DataExport =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; fileName: string; size: string; url: string };

/**
 * "Exportar meus dados": gera o JSON (RPC export_my_data) no aparelho e oferece "Baixar".
 * LGPD: o conteúdo nunca vai para logs; o arquivo só existe na memória da aba até ser baixado.
 */
export function useDataExport(canEdit: boolean) {
  const { api } = useProfileSource();
  const shell = useAppShell();
  const [state, setState] = useState<DataExport>({ status: "idle" });
  const urlRef = useRef<string | null>(null);

  // Libera o arquivo da memória ao sair da tela.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = useCallback(async () => {
    if (!canEdit) {
      shell.showToast("Sem conexão", { tone: "warning", icon: WifiOff, message: "Para exportar seus dados, conecte-se à internet." });
      return;
    }
    setState({ status: "preparing" });
    const toast = shell.showToast("Preparando seus dados…", { tone: "loading" });
    const { data, error } = await api.exportMyData(getSupabaseClient());
    if (error) {
      setState({ status: "idle" });
      shell.updateToast(toast, error.message, { tone: "error" });
      return;
    }
    shell.updateToast(toast, "Arquivo pronto", { tone: "success", message: "Toque em Baixar para salvar." });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    setState({ status: "ready", fileName: exportFileName(new Date()), size: formatFileSize(blob.size), url });
  }, [api, canEdit, shell, setState]);

  const download = useCallback(() => {
    if (state.status !== "ready") return;
    const link = document.createElement("a");
    link.href = state.url;
    link.download = state.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    shell.showToast("Download iniciado", { tone: "success", icon: Download });
  }, [state, shell]);

  const subtitle =
    state.status === "preparing"
      ? "Preparando arquivo…"
      : state.status === "ready"
        ? `Arquivo pronto · ${state.fileName} · ${state.size}`
        : "Arquivo JSON com tudo do seu perfil";

  return { state, subtitle, start, download };
}

export type DataExportApi = ReturnType<typeof useDataExport>;
