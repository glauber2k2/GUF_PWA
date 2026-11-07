"use client";

import { useState } from "react";
import type { MemberProfile } from "@guf/api";
import { useMemberActiveProject } from "@/features/social/api/use-social";
import { ActiveProjectRow } from "@/features/social/components/active-project/active-project-row";
import { ActiveProjectSheet } from "@/features/social/components/active-project/active-project-sheet";

/**
 * Projeto ativo no perfil: só com o histórico visível (a mesma opção "Visibilidade de treino"
 * controla os dois). Discreto: carregando, sem projeto ou com erro, não ocupa espaço.
 */
export function ActiveProjectSection({ userId, profile }: { userId: string | null; profile: MemberProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const project = useMemberActiveProject(userId, profile.historyVisible);
  if (!project.data) return null;
  return (
    <>
      <ActiveProjectRow project={project.data} onOpen={() => setIsOpen(true)} />
      <ActiveProjectSheet
        project={project.data}
        handle={profile.handle}
        isSelf={profile.isSelf}
        historyHidden={profile.historyHidden}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
