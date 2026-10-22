"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { findMeasurementPart, type BodyMeasurementDay, type MeasurementPart } from "@guf/core";
import { Banner, Button, ConfirmDialog, Skeleton } from "@/shared/components/ds";
import { EditorFrame } from "@/shared/components/editor-frame";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useRaisedToast } from "@/features/app-shell";
import { useBodyMeasurements, useCanUseMeasurements, useMeasurementsSource } from "@/features/body-measurements/api/use-body-measurements";
import { MeasurementDateCard } from "@/features/body-measurements/components/measurement-date-card";
import { MeasurementFieldCard } from "@/features/body-measurements/components/measurement-field-card";
import { measurementsPath, MEASUREMENTS_PATH } from "@/features/body-measurements/helpers/paths";
import { useMeasurementRegister } from "@/features/body-measurements/hooks/use-measurement-register";

const TITLE = "Nova medição";
const CLOSE_LABEL = "Fechar sem salvar";

/** /medidas/registrar[?musculo=<músculo>] (protótipo 1f/1g): carrega as medidas e abre o formulário. */
export function MeasurementRegisterScreen() {
  const router = useRouter();
  const goBack = useGoBack(MEASUREMENTS_PATH);
  const focus = findMeasurementPart(useSearchParams().get("musculo"));
  const { dev } = useMeasurementsSource();
  const measurements = useBodyMeasurements();
  const data = measurements.data;

  useEffect(() => {
    if (data && !data.hasConsent) router.replace(measurementsPath());
  }, [data, router]);

  if (dev.forceLoading || measurements.isPending || measurements.isError || !data?.hasConsent) {
    return (
      <EditorFrame title={TITLE} onBack={goBack} backIcon={X} backLabel={CLOSE_LABEL}>
        {measurements.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void measurements.refetch()}>
            Não foi possível carregar suas medidas. Verifique a internet e tente de novo.
          </Banner>
        ) : (
          <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-4">
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[160px] rounded-lg" />
          </div>
        )}
      </EditorFrame>
    );
  }

  return <MeasurementRegisterForm days={data.days} focus={focus} onClose={goBack} />;
}

function MeasurementRegisterForm({ days, focus, onClose }: { days: BodyMeasurementDay[]; focus: MeasurementPart | null; onClose: () => void }) {
  const canUse = useCanUseMeasurements();
  const form = useMeasurementRegister({ days, focus, canUse, onSaved: onClose });
  const [confirmLeave, setConfirmLeave] = useState(false);
  useRaisedToast(true);

  const close = () => (form.hasInput ? setConfirmLeave(true) : onClose());

  return (
    <EditorFrame
      title={TITLE}
      onBack={close}
      backIcon={X}
      backLabel={CLOSE_LABEL}
      bottomBar={
        <Button size="lg" icon={Check} fullWidth disabled={!form.canSave} loading={form.isSaving} onClick={form.submit}>
          {form.saveLabel}
        </Button>
      }
    >
      {!canUse && (
        <Banner tone="warning" title="Sem conexão">
          para salvar suas medidas, conecte-se à internet. O que você digitou continua aqui.
        </Banner>
      )}
      <MeasurementDateCard
        mode={form.mode}
        onMode={form.setMode}
        measuredOn={form.measuredOn}
        onSelect={form.selectDay}
        dateLabel={form.dateLabel}
        hasConflict={form.hasConflict}
        today={form.today}
      />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-base leading-[22px] font-bold">Medidas (cm)</h2>
        <span className="text-xs leading-4 text-fg-muted">Preencha só o que mediu</span>
      </div>
      {form.parts.map((part) => (
        <MeasurementFieldCard key={part.key} part={part} draft={form.draft} lastValues={form.lastValues} disabled={form.isSaving} onChange={form.changeField} />
      ))}
      {form.canShowAll && (
        <Button variant="outline" size="tall" icon={Plus} fullWidth onClick={form.showAll}>
          Medir outros músculos
        </Button>
      )}
      <ConfirmDialog
        placement="screen"
        open={confirmLeave}
        title="Descartar esta medição?"
        message="As medidas digitadas não foram salvas."
        cancelLabel="Continuar editando"
        confirmLabel="Descartar"
        destructive
        onCancel={() => setConfirmLeave(false)}
        onConfirm={onClose}
      />
    </EditorFrame>
  );
}
