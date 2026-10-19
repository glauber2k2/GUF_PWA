"use client";

import { useState } from "react";
import { ClipboardList, Dumbbell, History, Plus } from "lucide-react";
import { Button, Icon } from "@/shared/components/ds";
import { TOUR_STEPS, TOUR_TARGETS, TourOverlay } from "@/features/onboarding";
import { cn } from "@/shared/helpers/class-names";
import { PANEL, Section, SectionHeader } from "./layout";

const DEMO_TARGETS = [
  { target: TOUR_TARGETS.projectsTab, label: "Aba Projetos", icon: ClipboardList },
  { target: TOUR_TARGETS.newProject, label: "Novo projeto", icon: Plus },
  { target: TOUR_TARGETS.trainTab, label: "Aba Treinar", icon: Dumbbell },
  { target: TOUR_TARGETS.history, label: "Histórico", icon: History },
];

/**
 * Overlay do tour de onboarding isolado: percorre os passos reais sobre alvos de exemplo, sem
 * trocar de rota nem gravar a conclusão.
 */
export function TourSection({ id }: { id?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const step = index === null ? null : TOUR_STEPS[index];

  return (
    <Section id={id}>
      <SectionHeader
        index="11 · Tutorial"
        title="Tour de onboarding"
        action={
          <Button variant="primary" onClick={() => setIndex(0)}>
            Ver o tour
          </Button>
        }
      >
        Escurece a tela com recorte no elemento marcado com data-tour, anel volt e card no rodapé (ou no topo, se o alvo estiver na metade de
        baixo). Avança só pelos botões; Esc pula. Aqui os passos não trocam de rota.
      </SectionHeader>

      <div className={cn(PANEL, "flex flex-wrap gap-3 p-4")}>
        {DEMO_TARGETS.map((demo) => (
          <span
            key={demo.target}
            data-tour={demo.target}
            className="flex h-12 items-center gap-2 rounded-md bg-surface-3 px-4 text-[15px] font-semibold"
          >
            <Icon icon={demo.icon} size={18} className="text-accent-text" />
            {demo.label}
          </span>
        ))}
      </div>

      {step && index !== null && (
        <TourOverlay
          step={step}
          position={index + 1}
          total={TOUR_STEPS.length}
          onNext={() => setIndex(index === TOUR_STEPS.length - 1 ? null : index + 1)}
          onBack={index > 0 ? () => setIndex(index - 1) : undefined}
          onSkip={() => setIndex(null)}
        />
      )}
    </Section>
  );
}
