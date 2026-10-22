"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { lastMeasurementLabel, MEASUREMENT_PARTS, type BodyMeasurementDay } from "@guf/core";
import { Banner, Button, Skeleton } from "@/shared/components/ds";
import { EditorFrame } from "@/shared/components/editor-frame";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useRaisedToast } from "@/features/app-shell";
import { useBodyMeasurements, useCanUseMeasurements, useGrantHealthConsent, useMeasurementsSource } from "@/features/body-measurements/api/use-body-measurements";
import { HealthConsentStep } from "@/features/body-measurements/components/health-consent-step";
import { MeasurementPartRow } from "@/features/body-measurements/components/measurement-part-row";
import { PrivateNotice } from "@/features/body-measurements/components/private-notice";
import { measurementRegisterPath, PROFILE_PATH } from "@/features/body-measurements/helpers/paths";

const TITLE = "Medidas corporais";

const GROUPS = [
  { title: "Braços e pernas", note: "Esquerdo e direito", parts: MEASUREMENT_PARTS.filter((part) => part.sites.kind === "bilateral") },
  { title: "Tronco", note: "Medida única", parts: MEASUREMENT_PARTS.filter((part) => part.sites.kind === "single") },
];

/** /medidas (protótipo 1c): autorização na primeira vez; depois, a lista por músculo e "Registrar medidas". */
export function MeasurementsScreen() {
  const router = useRouter();
  const goBack = useGoBack(PROFILE_PATH);
  const { dev } = useMeasurementsSource();
  const measurements = useBodyMeasurements();
  const grant = useGrantHealthConsent();
  const canUse = useCanUseMeasurements();
  const data = measurements.data;
  const showList = Boolean(data?.hasConsent) && !dev.forceLoading;
  useRaisedToast(showList);

  if (dev.forceLoading || measurements.isPending) {
    return (
      <EditorFrame title={TITLE} onBack={goBack}>
        <div aria-busy="true" aria-label="Carregando medidas" className="flex flex-col gap-4">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </EditorFrame>
    );
  }

  if (measurements.isError || !data) {
    return (
      <EditorFrame title={TITLE} onBack={goBack}>
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void measurements.refetch()}>
          {canUse ? "Não foi possível carregar suas medidas. Tente de novo em instantes." : "Sem conexão. Para ver suas medidas, conecte-se à internet."}
        </Banner>
      </EditorFrame>
    );
  }

  if (!data.hasConsent) {
    return (
      <EditorFrame title={TITLE} onBack={goBack}>
        {!canUse && <OfflineBanner />}
        <HealthConsentStep
          canUse={canUse}
          isGranting={grant.isPending}
          error={grant.error?.message ?? null}
          onDecline={goBack}
          onGrant={() => grant.mutate()}
        />
      </EditorFrame>
    );
  }

  return (
    <EditorFrame
      title={TITLE}
      onBack={goBack}
      bottomBar={
        <Button size="lg" icon={Plus} fullWidth disabled={!canUse} onClick={() => router.push(measurementRegisterPath())}>
          Registrar medidas
        </Button>
      }
    >
      {!canUse && <OfflineBanner />}
      <PrivateNotice />
      <MeasurementsList days={data.days} />
    </EditorFrame>
  );
}

function OfflineBanner() {
  return (
    <Banner tone="warning" title="Sem conexão">
      para registrar ou ver suas medidas, conecte-se à internet.
    </Banner>
  );
}

function MeasurementsList({ days }: { days: BodyMeasurementDay[] }) {
  const [today] = useState(() => new Date());
  const last = lastMeasurementLabel(days, today);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Última medição</span>
        <span className="text-sm leading-5 font-semibold">{last ?? "Nenhuma ainda"}</span>
      </div>
      {GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-base leading-[22px] font-bold">{group.title}</h2>
            <span className="text-xs leading-4 text-fg-muted">{group.note}</span>
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
            {group.parts.map((part) => (
              <MeasurementPartRow key={part.key} part={part} days={days} today={today} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
