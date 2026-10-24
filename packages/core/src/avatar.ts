/**
 * Foto do usuário (pura, sem React). Prioridade:
 * 1. foto enviada pelo próprio usuário (Editar perfil) — vale para login social e e-mail/senha;
 * 2. foto atual da conta social (Google), vinda dos metadados da sessão;
 * 3. foto social guardada no cadastro (`profiles.avatar_url`, preenchida pelo gatilho handle_new_user);
 * 4. sem foto → inicial do nome (avatarInitial).
 *
 * Convenção de `profiles.avatar_url`: URL http(s) = foto social copiada no cadastro;
 * caminho sem protocolo (ex.: "<user_id>/avatar.webp") = foto enviada, guardada no Storage (bucket AVATAR_BUCKET).
 */

/** Bucket público do Supabase Storage para fotos enviadas (pasta <user_id>/; migration edit_profile). */
export const AVATAR_BUCKET = "avatars";

const HTTP_URL = /^https?:\/\//i;

/** Caminho de uma foto enviada no bucket (a pasta é o id do usuário: as políticas do Storage conferem). */
export function avatarStoragePath(userId: string, fileId: string): string {
  return `${userId}/${fileId}.jpg`;
}

/** Foto enviada pelo usuário (caminho no Storage), e não URL de conta social. */
export function isUploadedAvatar(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "" && !HTTP_URL.test(value.trim());
}

function httpUrl(value: unknown): string | null {
  return typeof value === "string" && HTTP_URL.test(value.trim()) ? value.trim() : null;
}

/** Metadados no formato do Supabase Auth (user_metadata e identities[].identity_data). */
export interface AvatarAuthUser {
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }> | null;
}

/** Foto da conta social: metadados do usuário e, se faltar (conta de e-mail vinculada ao Google), a da identidade. */
export function socialAvatarUrl(user: AvatarAuthUser | null | undefined): string | null {
  if (!user) return null;
  const fromMeta = httpUrl(user.user_metadata?.avatar_url) ?? httpUrl(user.user_metadata?.picture);
  if (fromMeta) return fromMeta;
  for (const identity of user.identities ?? []) {
    const url = httpUrl(identity.identity_data?.avatar_url) ?? httpUrl(identity.identity_data?.picture);
    if (url) return url;
  }
  return null;
}

export type AvatarSource = { kind: "uploaded"; path: string } | { kind: "url"; url: string } | null;

/** Qual foto exibir (ver prioridade no topo do arquivo). */
export function pickAvatar(profileAvatar: string | null | undefined, user: AvatarAuthUser | null | undefined): AvatarSource {
  if (isUploadedAvatar(profileAvatar)) return { kind: "uploaded", path: profileAvatar.trim() };
  const url = socialAvatarUrl(user) ?? httpUrl(profileAvatar);
  return url ? { kind: "url", url } : null;
}

/** Foto do Google em tamanho adequado à tela ("…=s96-c" → "…=s256-c"); outras URLs ficam iguais. */
export function sizedAvatarUrl(url: string, px = 256): string {
  if (!/googleusercontent\.com\//i.test(url)) return url;
  return /=s\d+(-c)?$/.test(url) ? url.replace(/=s\d+(-c)?$/, `=s${px}-c`) : url;
}
