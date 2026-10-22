/** Ambiente do painel (selo no topo): produção pede atenção; teste fica neutro. */
export type AdminEnvironment = "prod" | "test";

export const ADMIN_ENVIRONMENT: AdminEnvironment = process.env.NEXT_PUBLIC_ADMIN_ENV === "prod" ? "prod" : "test";

/** Domínio dos e-mails da equipe (convite); vazio = qualquer domínio (a Edge Function confere de novo). */
export const STAFF_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_STAFF_EMAIL_DOMAIN ?? "";
