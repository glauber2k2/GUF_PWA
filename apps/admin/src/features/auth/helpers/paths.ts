import type { StaffAccess } from "@guf/api/admin";

export const AUTH_PATHS = {
  login: "/entrar",
  code: "/entrar/codigo",
  setup: "/entrar/segundo-fator",
  noAccess: "/sem-acesso",
  firstAccess: "/primeiro-acesso",
} as const;

export const HOME_PATH = "/";

/** Para onde cada situação de acesso leva (o painel só abre com "ready"). */
export function pathForAccess(status: StaffAccess["status"]): string {
  switch (status) {
    case "signed_out":
      return AUTH_PATHS.login;
    case "not_staff":
      return AUTH_PATHS.noAccess;
    case "mfa_setup":
      return AUTH_PATHS.setup;
    case "mfa_challenge":
      return AUTH_PATHS.code;
    case "ready":
      return HOME_PATH;
  }
}
