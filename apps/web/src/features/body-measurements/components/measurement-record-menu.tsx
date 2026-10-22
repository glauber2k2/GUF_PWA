"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { MeasurementPart, MeasurementRecordRow } from "@guf/core";
import { BottomSheet, ConfirmDialog, DangerSheetOption, SheetOption } from "@/shared/components/ds";

interface MeasurementRecordMenuProps {
  part: MeasurementPart;
  /** Registro com o menu aberto; null = fechado. */
  record: MeasurementRecordRow | null;
  canUse: boolean;
  onClose: () => void;
  onEdit: (measuredOn: string) => void;
  onDelete: (measuredOn: string) => void;
}

const OFFLINE_REASON = "Sem conexão: conecte-se à internet";

/** Menu do registro (três pontinhos): editar ou excluir, com confirmação antes de excluir. */
export function MeasurementRecordMenu({ part, record, canUse, onClose, onEdit, onDelete }: MeasurementRecordMenuProps) {
  const [confirming, setConfirming] = useState<MeasurementRecordRow | null>(null);
  const bothSides = part.sites.kind === "bilateral" ? " (os dois lados)" : "";

  const confirmDelete = () => {
    if (confirming) onDelete(confirming.measuredOn);
    setConfirming(null);
  };

  return (
    <>
      <BottomSheet placement="screen" open={record !== null} onClose={onClose} title={`${part.name} · ${record?.dateLabel ?? ""}`}>
        <SheetOption
          icon={Pencil}
          title="Editar"
          subtitle={canUse ? undefined : OFFLINE_REASON}
          disabled={!canUse}
          onClick={() => record && onEdit(record.measuredOn)}
        />
        <DangerSheetOption
          icon={Trash2}
          title="Excluir"
          subtitle={canUse ? undefined : OFFLINE_REASON}
          disabled={!canUse}
          onClick={() => {
            setConfirming(record);
            onClose();
          }}
        />
      </BottomSheet>
      <ConfirmDialog
        placement="screen"
        destructive
        open={confirming !== null}
        title="Excluir este registro?"
        message={`${part.name}${bothSides} de ${confirming?.dateLabel ?? ""} sai do gráfico e da lista.`}
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
