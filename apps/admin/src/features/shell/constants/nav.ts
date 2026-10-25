import { Dumbbell, House, Megaphone, ScrollText, UserCog, Users, type LucideIcon } from "lucide-react";
import type { StaffPermission } from "@guf/core";

export interface AdminNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  /** Sem a permissão, o item nem aparece (a tela também confere). */
  permission?: StaffPermission;
}

/** Menu do painel. Área nova = item novo aqui (o atalho numérico segue a posição). */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Início", icon: House, path: "/" },
  { label: "Pessoas", icon: Users, path: "/pessoas" },
  { label: "Comunicados", icon: Megaphone, path: "/comunicados" },
  { label: "Exercícios", icon: Dumbbell, path: "/exercicios" },
  { label: "Auditoria", icon: ScrollText, path: "/auditoria", permission: "view_audit" },
  { label: "Equipe", icon: UserCog, path: "/equipe", permission: "manage_team" },
];

/** Título da barra do celular por rota. */
export const PAGE_TITLES: Record<string, string> = {
  "/": "Início",
  "/pessoas": "Pessoas",
  "/comunicados": "Comunicados",
  "/comunicados/editar": "Comunicado",
  "/comunicados/resultado": "Resultado",
  "/exercicios": "Exercícios",
  "/exercicios/importar": "Importar exercícios",
  "/auditoria": "Auditoria",
  "/equipe": "Equipe",
};

/** Telas internas: no celular a barra mostra "Voltar" para a lista. */
export const BACK_PATHS: Record<string, string> = {
  "/comunicados/editar": "/comunicados",
  "/comunicados/resultado": "/comunicados",
  "/exercicios/importar": "/exercicios",
};

export function isNavActive(item: AdminNavItem, pathname: string): boolean {
  return item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export const PEOPLE_SEARCH_INPUT_ID = "busca-pessoa";
