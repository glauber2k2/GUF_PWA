/** Rotas da aba Projetos (site estático: ids na query string). */
export const PROJECTS_PATH = "/projetos";

export const projectDetailPath = (projectId: string) => `/projetos/detalhe?id=${encodeURIComponent(projectId)}`;

/** Editar rotina existente. */
export const routinePath = (routineId: string) => `/rotina?id=${encodeURIComponent(routineId)}`;

/** Nova rotina dentro do projeto. */
export const newRoutinePath = (projectId: string) => `/rotina?projeto=${encodeURIComponent(projectId)}`;

/** Nova rotina no projeto informado (ex.: o ativo); sem projeto, a lista de Projetos para escolher um. */
export const newRoutinePathFor = (projectId: string | null | undefined) => (projectId ? newRoutinePath(projectId) : PROJECTS_PATH);
