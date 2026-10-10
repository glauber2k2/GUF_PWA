/** Rotas da aba Projetos (site estático: ids na query string). */
export const PROJECTS_PATH = "/projetos";

export const projectDetailPath = (projectId: string) => `/projetos/detalhe?id=${encodeURIComponent(projectId)}`;
