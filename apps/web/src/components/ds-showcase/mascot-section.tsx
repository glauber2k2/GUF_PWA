"use client";

import { useState } from "react";
import { Chip, GUF_RAT_GROUPS, GUF_RAT_SPECS, GufRat } from "@/components/ds";
import { cn } from "@/lib/utils";
import { Group, PANEL, Section, SectionHeader } from "./layout";

/** Vitrine do mascote (Claude Design · "Guf Rat Forte v2"): 34 ocasiões, estático ou animado. */
export function MascotSection({ id }: { id?: string }) {
  const [animated, setAnimated] = useState(true);

  return (
    <Section id={id} gap="gap-10">
      <SectionHeader
        index="10 · Mascote"
        title="Guf Rat"
        action={
          <div className="flex gap-2">
            <Chip label="Animado" selected={animated} onChange={() => setAnimated(true)} />
            <Chip label="Estático" selected={!animated} onChange={() => setAnimated(false)} />
          </div>
        }
      >
        Rato sempre branco com regata volt; no tema claro ganha contorno escuro. Uso: &lt;GufRat occasion=&quot;workoutDone&quot; /&gt;
        (badge opcional). Com movimento reduzido, fica parado.
      </SectionHeader>

      {GUF_RAT_GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {group.occasions.map((occasion) => {
              const spec = GUF_RAT_SPECS[occasion];
              return (
                <div key={occasion} className={cn(PANEL, "flex flex-col gap-3 p-4")}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] leading-[22px] font-semibold">{spec.name}</span>
                    <span className="text-[13px] leading-[18px] text-fg-muted">
                      {spec.use} · <code className="text-fg-secondary">{occasion}</code>
                    </span>
                  </div>
                  <div className="grid h-[200px] place-items-center overflow-hidden rounded-md border border-border bg-background">
                    <GufRat occasion={occasion} animated={animated} badge />
                  </div>
                </div>
              );
            })}
          </div>
        </Group>
      ))}
    </Section>
  );
}
