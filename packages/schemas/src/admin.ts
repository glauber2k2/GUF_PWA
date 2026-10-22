import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_LIMITS,
  CHANGE_REASONS,
  REASON_NOTE_LIMITS,
  STAFF_ROLES,
  isPurposeAllowed,
  type ChangeReason,
  type StaffRole,
} from "@guf/core";
import { z } from "zod";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data.");

/** Uma regra do público (mesma validação de audience_rule_valid no banco). */
export const audienceRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("ids") }),
  z.object({ type: z.literal("plans"), plans: z.array(z.string().min(1)).min(1, "Escolha pelo menos um plano.").max(10) }),
  z.object({ type: z.literal("created"), op: z.enum(["before", "on", "after"]), date: isoDay }),
  z.object({ type: z.literal("visibility"), value: z.enum(["private", "open"]) }),
  z.object({ type: z.literal("health_consent") }),
]);

export const audienceSchema = z
  .object({ rules: z.array(audienceRuleSchema).min(1).max(6) })
  .refine((a) => new Set(a.rules.map((r) => r.type)).size === a.rules.length, "Cada regra aparece uma vez.")
  .refine((a) => !a.rules.some((r) => r.type === "all") || a.rules.length === 1, "“Todos” não se soma a outras regras.");

const destinationPaths = ANNOUNCEMENT_DESTINATIONS.map((d) => d.path) as [string, ...string[]];

/** Rascunho do comunicado (o editor salva aos poucos; publicar exige o resto, conferido no banco). */
export const announcementDraftSchema = z
  .object({
    title: z.string().trim().max(ANNOUNCEMENT_LIMITS.title, `Use até ${ANNOUNCEMENT_LIMITS.title} caracteres.`),
    body: z.string().trim().max(ANNOUNCEMENT_LIMITS.body, `Use até ${ANNOUNCEMENT_LIMITS.body} caracteres.`),
    format: z.enum(["fullscreen", "modal", "toast", "banner"]),
    tone: z.enum(["info", "success", "warning", "news"]),
    ctaLabel: z.string().trim().max(ANNOUNCEMENT_LIMITS.ctaLabel).nullable(),
    ctaPath: z.enum(destinationPaths).nullable(),
    audience: audienceSchema,
    purpose: z.enum(["service", "legal", "product"]),
    priority: z.union([z.literal(0), z.literal(50), z.literal(100)]),
    frequency: z.enum(["once", "until_dismissed"]),
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    endsAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .refine((d) => isPurposeAllowed(d.audience, d.purpose), {
    message: "Com a regra de consentimento de saúde, use a finalidade Serviço ou Legal.",
    path: ["purpose"],
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, {
    message: "O fim precisa ser depois do começo.",
    path: ["endsAt"],
  });

export type AnnouncementDraftInput = z.input<typeof announcementDraftSchema>;

/** Pronto para publicar: título, texto e fim no futuro. */
export const announcementPublishSchema = z.object({
  title: z.string().trim().min(1, "Escreva o título."),
  body: z.string().trim().min(1, "Escreva o texto."),
  endsAt: z.string({ error: "Escolha quando o comunicado termina." }).min(1, "Escolha quando o comunicado termina."),
});

const reasonKeys = Object.keys(CHANGE_REASONS) as [ChangeReason, ...ChangeReason[]];

/** Motivo de uma alteração na conta (fica na auditoria). */
export const changeReasonSchema = z
  .object({
    reason: z.enum(reasonKeys, { error: "Escolha um motivo. Ele fica registrado na auditoria." }),
    note: z.string().trim().max(REASON_NOTE_LIMITS.max, `Use até ${REASON_NOTE_LIMITS.max} caracteres.`),
  })
  .refine((r) => r.reason !== "other" || r.note.length >= REASON_NOTE_LIMITS.min, {
    message: "Descreva o motivo.",
    path: ["note"],
  });

export const staffNameSchema = z.string().trim().min(1, "Informe o nome. Ele aparece no perfil social.").max(100, "Use até 100 caracteres.");

const roleKeys = Object.keys(STAFF_ROLES) as [StaffRole, ...StaffRole[]];

/** Convite de colaborador (o domínio da equipe é conferido de novo na Edge Function). */
export function staffInviteSchema(teamDomain: string) {
  return z.object({
    email: z
      .email("Digite um e-mail válido.")
      .trim()
      .toLowerCase()
      .refine((e) => !teamDomain || e.endsWith(`@${teamDomain}`), `Use o e-mail da equipe, terminado em @${teamDomain}.`),
    displayName: z.string().trim().min(1, "Informe o nome da pessoa.").max(80),
    role: z.enum(roleKeys),
  });
}
