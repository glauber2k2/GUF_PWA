"use client";

import Link from "next/link";
import { ChevronRight, EyeOff } from "lucide-react";
import { measurementsEntrySubtitle } from "@guf/core";
import { Icon, MuscleIcon } from "@/shared/components/ds";
import { useBodyMeasurements } from "@/features/body-measurements/api/use-body-measurements";
import { measurementsPath } from "@/features/body-measurements/helpers/paths";

/**
 * Entrada das medidas no SEU perfil (protótipo 1a), logo abaixo das ações. Para outras pessoas o
 * botão não existe (nem aviso de "conteúdo oculto"): quem compõe a tela só o mostra no perfil próprio.
 */
export function MeasurementsEntry() {
  const measurements = useBodyMeasurements();
  const subtitle = measurements.data ? measurementsEntrySubtitle(measurements.data.days) : "Circunferências, só para você";
  return (
    <Link
      href={measurementsPath()}
      className="flex min-h-[72px] items-center gap-3.5 rounded-lg border border-border bg-surface py-3 pr-3.5 pl-3 text-left text-fg no-underline transition-colors hover:bg-surface-elevated"
    >
      <span className="grid size-12 flex-none place-items-center overflow-hidden rounded-[12px] bg-surface-3">
        <MuscleIcon muscle="biceps" zoom size={46} animate="none" label="" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-[15px] leading-5 font-semibold">Medidas corporais</strong>
        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">{subtitle}</span>
      </span>
      <span className="flex h-6 flex-none items-center gap-1 rounded-pill bg-surface-3 px-2 text-xs font-semibold whitespace-nowrap text-fg-secondary">
        <Icon icon={EyeOff} size={13} />
        Só você
      </span>
      <Icon icon={ChevronRight} size={18} className="flex-none text-fg-muted" />
    </Link>
  );
}
