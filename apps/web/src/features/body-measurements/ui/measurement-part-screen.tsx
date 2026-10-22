"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { findMeasurementPart, measurementRecordRows, type BodyMeasurementDay, type MeasurementPart, type MeasurementPeriod, type MeasurementRecordRow, type MeasurementSide } from "@guf/core";
import { Banner, Button, MuscleIcon, SegmentedControl, Skeleton } from "@/shared/components/ds";
import { EditorFrame } from "@/shared/components/editor-frame";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { cn } from "@/shared/helpers/class-names";
import { useRaisedToast } from "@/features/app-shell";
import { useBodyMeasurements, useCanUseMeasurements, useMeasurementsSource } from "@/features/body-measurements/api/use-body-measurements";
import { MeasurementChartCard } from "@/features/body-measurements/components/measurement-chart-card";
import { MeasurementRecords } from "@/features/body-measurements/components/measurement-records";
import { MeasurementRecordMenu } from "@/features/body-measurements/components/measurement-record-menu";
import { measurementEditPath, measurementRegisterPath, measurementsPath, MEASUREMENTS_PATH } from "@/features/body-measurements/helpers/paths";
import { useRemoveMeasurement } from "@/features/body-measurements/hooks/use-remove-measurement";

const SIDE_OPTIONS = [
  { value: "left", label: "Esquerdo" },
  { value: "right", label: "Direito" },
];

/**
 * /medidas/musculo?id=<músculo> (protótipo 1d/1e): como medir, lado esquerdo/direito (some na medida
 * única), gráfico com período e os registros.
 */
export function MeasurementPartScreen() {
  const router = useRouter();
  const goBack = useGoBack(MEASUREMENTS_PATH);
  const part = findMeasurementPart(useSearchParams().get("id"));
  const { dev } = useMeasurementsSource();
  const measurements = useBodyMeasurements();
  const canUse = useCanUseMeasurements();
  const data = measurements.data;
  const isReady = Boolean(part && data?.hasConsent) && !dev.forceLoading;
  useRaisedToast(isReady);

  // Sem autorização não há o que mostrar: a lista pede o consentimento.
  useEffect(() => {
    if (data && !data.hasConsent) router.replace(measurementsPath());
  }, [data, router]);

  if (!part) {
    return (
      <EditorFrame title="Medidas corporais" onBack={goBack}>
        <Banner tone="warning" actionLabel="Voltar" onAction={goBack}>
          Não encontramos esta medida. Volte e escolha um músculo da lista.
        </Banner>
      </EditorFrame>
    );
  }

  if (dev.forceLoading || measurements.isPending || !data?.hasConsent) {
    return (
      <EditorFrame title={part.name} onBack={goBack}>
        {measurements.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void measurements.refetch()}>
            {canUse ? "Não foi possível carregar suas medidas. Tente de novo em instantes." : "Sem conexão. Para ver suas medidas, conecte-se à internet."}
          </Banner>
        ) : (
          <div aria-busy="true" aria-label="Carregando medidas" className="flex flex-col gap-4">
            <Skeleton className="h-[88px] rounded-lg" />
            <Skeleton className="h-[320px] rounded-lg" />
            <Skeleton className="h-[220px] rounded-lg" />
          </div>
        )}
      </EditorFrame>
    );
  }

  return <MeasurementPartDetail part={part} days={data.days} canUse={canUse} onBack={goBack} />;
}

function MeasurementPartDetail({ part, days, canUse, onBack }: { part: MeasurementPart; days: BodyMeasurementDay[]; canUse: boolean; onBack: () => void }) {
  const router = useRouter();
  const removeRecord = useRemoveMeasurement(part, days);
  const [side, setSide] = useState<MeasurementSide>("right");
  const [period, setPeriod] = useState<MeasurementPeriod>("6M");
  const [today] = useState(() => new Date());
  const [menuRecord, setMenuRecord] = useState<MeasurementRecordRow | null>(null);
  const isBilateral = part.sites.kind === "bilateral";
  return (
    <EditorFrame
      title={part.name}
      onBack={onBack}
      bottomBar={
        <Button size="lg" icon={Plus} fullWidth disabled={!canUse} onClick={() => router.push(measurementRegisterPath(part.key))}>
          {`Registrar ${part.name.toLowerCase()}`}
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <span className="grid size-[88px] flex-none place-items-center overflow-hidden rounded-[18px] border border-border bg-surface">
          {/* O ícone desenha o lado direito do corpo; no esquerdo, espelhado. */}
          <span className={cn("grid", isBilateral && side === "left" && "-scale-x-100")}>
            <MuscleIcon muscle={part.key} zoom size={86} animate="once" label="" />
          </span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Como medir</span>
          <span className="text-sm leading-5 text-pretty text-fg-secondary">{part.tip}</span>
        </div>
      </div>

      {isBilateral && <SegmentedControl options={SIDE_OPTIONS} value={side} onChange={(value) => setSide(value as MeasurementSide)} label="Lado do corpo" />}

      <MeasurementChartCard part={part} side={side} days={days} period={period} onPeriod={setPeriod} today={today} />
      <MeasurementRecords rows={measurementRecordRows(days, part, side)} onOpenMenu={setMenuRecord} />
      <MeasurementRecordMenu
        part={part}
        record={menuRecord}
        canUse={canUse}
        onClose={() => setMenuRecord(null)}
        onEdit={(measuredOn) => {
          setMenuRecord(null);
          router.push(measurementEditPath(part.key, measuredOn));
        }}
        onDelete={removeRecord}
      />
    </EditorFrame>
  );
}
