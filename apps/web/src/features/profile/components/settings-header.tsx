"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "@/shared/components/ds";

interface SettingsHeaderProps {
  title: string;
  onBack: () => void;
  /** Ação à direita (ex.: "Ver tutorial"). */
  trailing?: ReactNode;
}

/** Cabeçalho fixo das telas de Configurações (principal e subpáginas): voltar, título e uma ação. */
export function SettingsHeader({ title, onBack, trailing }: SettingsHeaderProps) {
  return (
    <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
      <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={onBack} />
      <h1 className="m-0 min-w-0 flex-1 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">{title}</h1>
      {trailing}
    </div>
  );
}
