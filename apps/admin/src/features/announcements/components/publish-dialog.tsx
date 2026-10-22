"use client";

import { formatCount } from "@guf/core";
import { Banner, Button } from "@guf/ui";
import { formatDayTime } from "@/features/announcements/helpers/announcement-display";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface PublishDialogProps {
  reach: number | undefined;
  startsAt: string | null;
  isPublishing: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** 8g · Confirmação final: quantas pessoas e quando. Publicado não se edita (encerrar e duplicar). */
export function PublishDialog({ reach, startsAt, isPublishing, errorMessage, onClose, onConfirm }: PublishDialogProps) {
  const scheduled = Boolean(startsAt && startsAt > new Date().toISOString());
  const action = scheduled ? "Agendar" : "Publicar";
  const reachText = reach === undefined ? "…" : formatCount(reach);
  return (
    <Dialog open title={`${action} comunicado?`} onClose={onClose}>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl leading-none font-bold tabular-nums">{reachText}</span>
        <span className="text-fg-secondary">pessoas, aproximadamente</span>
      </div>
      <p className="m-0 text-pretty text-fg-secondary">
        {scheduled && startsAt
          ? `O comunicado aparece para cerca de ${reachText} pessoas a partir de ${formatDayTime(startsAt)} (horário de Brasília).`
          : `O comunicado aparece agora para cerca de ${reachText} pessoas.`}{" "}
        Depois de publicado, dá para encerrar a qualquer momento, mas não editar.
      </p>
      {errorMessage && <Banner tone="danger">{errorMessage}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
          Voltar
        </Button>
        <Button size="tall" fullWidth loading={isPublishing} onClick={onConfirm}>
          {action}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
