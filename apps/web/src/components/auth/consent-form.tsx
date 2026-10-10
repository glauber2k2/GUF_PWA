"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { acceptDocuments, hasPriorConsent, type AuthError } from "@guf/api";
import { consentRequirements, consentSourceFor, legalDocumentLabel } from "@guf/core";
import { Banner, Button, Checkbox, Icon, Logo } from "@/components/ds";
import { usePendingDocuments } from "@/hooks/use-pending-documents";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

/**
 * Portão /aceite (LGPD): documentos obrigatórios pendentes (pending_documents()).
 * Checkboxes sempre desmarcadas; "Aceitar e continuar" só habilita com todas marcadas.
 * Depois do aceite, o guarda de rota leva para o next (ou /).
 */
export function ConsentForm() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const pending = usePendingDocuments();
  const prior = useQuery({
    queryKey: ["has-prior-consent", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await hasPriorConsent(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });

  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const docs = pending.data ?? [];
  const { needsAge, needsTerms } = consentRequirements(docs.map((d) => d.doc_type));
  const allChecked = (!needsAge || ageChecked) && (!needsTerms || termsChecked);

  const accept = useMutation({
    mutationFn: async () => {
      const source = consentSourceFor({
        hasPriorConsent: prior.data ?? false,
        provider: user?.app_metadata.provider as string | undefined,
      });
      const { error } = await acceptDocuments(getSupabaseClient(), {
        documentIds: docs.map((d) => d.id),
        source,
        platform: "web",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-documents"] }),
    onError: (error) => {
      // Versão mudou no meio do caminho: recarregar a lista e pedir o aceite de novo.
      if ((error as unknown as AuthError).code === "documents_outdated") {
        setAgeChecked(false);
        setTermsChecked(false);
        void pending.refetch();
      }
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (allChecked && docs.length > 0) accept.mutate();
  };

  const onSignOut = async () => {
    setSigningOut(true);
    if (await signOut()) setSigningOut(false);
  };

  const loadError = pending.error ?? prior.error;
  const ready = pending.isSuccess && prior.isSuccess;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-14 pb-[calc(24px+env(safe-area-inset-bottom))] text-fg">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-6 text-center">
        <Logo size="lg" wordmark={false} />
        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">Antes de continuar</h1>
        <p className="m-0 max-w-[320px] text-base leading-6 text-pretty text-fg-secondary">
          Para usar o Guf, leia e confirme os documentos abaixo.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        {loadError ? (
          <Banner
            tone="danger"
            actionLabel="Tentar"
            onAction={() => {
              void pending.refetch();
              void prior.refetch();
            }}
          >
            {loadError.message}
          </Banner>
        ) : (
          <ul aria-label="Documentos para aceitar" className="m-0 flex list-none flex-col gap-2 p-0">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3">
                <Icon icon={FileText} size={20} className="text-fg-secondary" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-medium">{legalDocumentLabel(d.doc_type)}</span>
                  <span className="text-xs text-fg-muted">Versão {d.version}</span>
                </span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text no-underline hover:underline"
                >
                  Ler
                  <Icon icon={ExternalLink} size={14} />
                  <span className="sr-only"> {legalDocumentLabel(d.doc_type)} (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {ready && docs.length > 0 && (
          <div className="flex flex-col gap-1">
            {needsAge && (
              <Checkbox checked={ageChecked} onChange={(e) => setAgeChecked(e.target.checked)}>
                Tenho 18 anos ou mais
              </Checkbox>
            )}
            {needsTerms && (
              <Checkbox checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)}>
                Li e aceito os Termos de Uso e a Política de Privacidade
              </Checkbox>
            )}
          </div>
        )}

        {accept.error && <Banner tone="danger">{accept.error.message}</Banner>}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={accept.isPending}
          disabled={!ready || !allChecked || docs.length === 0 || signingOut}
        >
          {accept.isPending ? "Registrando" : "Aceitar e continuar"}
        </Button>
        <Button variant="secondary" size="lg" fullWidth loading={signingOut} disabled={accept.isPending} onClick={onSignOut}>
          Sair
        </Button>
      </form>
    </main>
  );
}
