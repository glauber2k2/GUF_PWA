"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PASSWORD_MIN_LENGTH } from "@guf/schemas";
import { Banner, Button, PasswordField } from "@guf/ui";
import { useSetPassword } from "@/features/auth/api/use-staff-session";
import { AuthFrame, AuthHeading } from "@/features/auth/components/auth-frame";
import { AUTH_PATHS } from "@/features/auth/helpers/paths";
import { useAdminApi } from "@/shared/libs/admin-api";
import { STAFF_ACCESS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

type LinkState = "checking" | "ready" | "invalid";

/** Link do convite (48 h): abre a sessão, a pessoa cria a senha e segue para o segundo fator. */
export function FirstAccessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { apis } = useAdminApi();
  const setPassword = useSetPassword();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPasswordValue] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    void apis.session.setSessionFromLink(getSupabaseClient(), hash).then(({ error }) => {
      // O token sai da barra de endereço (não fica no histórico nem em capturas de tela).
      window.history.replaceState(null, "", window.location.pathname);
      setLinkState(error ? "invalid" : "ready");
      void queryClient.invalidateQueries({ queryKey: [STAFF_ACCESS_KEY] });
    });
  }, [apis, queryClient]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) return;
    setPassword.mutate(password, { onSuccess: () => router.replace(AUTH_PATHS.setup) });
  };

  return (
    <AuthFrame>
      <AuthHeading eyebrow="Primeiro acesso" title="Crie sua senha">
        Ela vale só para o painel. Depois, você configura o segundo fator.
      </AuthHeading>
      {linkState === "invalid" && (
        <Banner tone="danger" title="Este link expirou ou já foi usado.">
          Peça um novo convite para uma pessoa administradora.
        </Banner>
      )}
      {setPassword.error && <Banner tone="danger">{setPassword.error.message}</Banner>}
      <form onSubmit={submit} className="flex flex-col gap-6">
        <PasswordField label="Nova senha" autoComplete="new-password" value={password} onChange={(e) => setPasswordValue(e.target.value)} />
        <Button
          type="submit"
          size="tall"
          fullWidth
          loading={setPassword.isPending || linkState === "checking"}
          disabled={linkState !== "ready" || password.length < PASSWORD_MIN_LENGTH}
        >
          Salvar e continuar
        </Button>
      </form>
    </AuthFrame>
  );
}
