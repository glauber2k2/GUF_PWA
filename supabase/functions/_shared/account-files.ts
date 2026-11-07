// =====================================================================
// Arquivos da conta no Storage (hoje só a foto: bucket "avatars", pasta <user_id>/).
// O Storage não apaga em cascata com auth.users, e o banco recusa excluir a conta com arquivos
// (GA015 em delete_account_now): toda exclusão (app, painel e agendada) apaga a foto antes.
// =====================================================================
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const AVATARS_BUCKET = "avatars";
const LIST_LIMIT = 1000;

/**
 * Apaga a foto da conta. Exige o cliente service_role: chamar só DEPOIS de conferir quem pede.
 * @returns false se não conseguiu apagar (a conta não deve ser excluída, para não deixar arquivo órfão).
 */
export async function removeAccountFiles(service: SupabaseClient, userId: string): Promise<boolean> {
  const avatars = service.storage.from(AVATARS_BUCKET);
  const { data: files, error: listError } = await avatars.list(userId, { limit: LIST_LIMIT });
  if (listError) {
    console.error("Exclusão da conta: falha ao listar a foto", { message: listError.message });
    return false;
  }
  if (!files || files.length === 0) return true;
  const { error } = await avatars.remove(files.map((file) => `${userId}/${file.name}`));
  if (error) {
    console.error("Exclusão da conta: falha ao apagar a foto", { message: error.message });
    return false;
  }
  return true;
}
