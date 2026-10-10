/** Rotas da aba Projetos (site estático: ids na query string). */
export const PROJECTS_PATH = "/projetos";

export const projectDetailPath = (projectId: string) => `/projetos/detalhe?id=${encodeURIComponent(projectId)}`;

/** Editar rotina existente. */
export const routinePath = (routineId: string) => `/rotina?id=${encodeURIComponent(routineId)}`;

/** Nova rotina dentro do projeto. */
export const newRoutinePath = (projectId: string) => `/rotina?projeto=${encodeURIComponent(projectId)}`;
