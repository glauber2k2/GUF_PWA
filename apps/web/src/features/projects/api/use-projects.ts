"use client";

import { useQuery } from "@tanstack/react-query";
import { projectsApi, type ProjectsApi } from "@guf/api";
import { PROJECTS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockProjectsApi, setProjectsMockOptions } from "@/mocks/projects";
import { useAuth } from "@/features/auth";
import { useDevProjectsState, type DevProjectsState } from "@/features/projects/hooks/use-dev-projects-state";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/**
 * Dados reais por padrão. Em DESENVOLVIMENTO, com ?estado=, usa o mock (mesmo contrato).
 * No build de produção o ramo do mock é eliminado (NODE_ENV é constante).
 */
export function useProjectsSource(): { api: ProjectsApi; dev: DevProjectsState } {
  const dev = useDevProjectsState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setProjectsMockOptions({ scenario: dev.scenario, dropOnSave: dev.dropOnSave });
    return { api: mockProjectsApi, dev };
  }
  return { api: projectsApi, dev };
}

/** Projetos com rotinas e o último treino concluído (rotina sugerida). Sem cópia offline: edição só online. */
export function useProjectsOverview() {
  const { user } = useAuth();
  const { api, dev } = useProjectsSource();
  return useQuery({
    queryKey: [PROJECTS_KEY, user?.id, dev.scenario],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await api.getProjectsOverview(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Criar/editar projetos e rotinas exige internet (decisão de produto: sem fila offline). */
export function useCanEditPlanning(): boolean {
  const online = useOnlineStatus();
  const { dev } = useProjectsSource();
  return online && !dev.forceOffline;
}
