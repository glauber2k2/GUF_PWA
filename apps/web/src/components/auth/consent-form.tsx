"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText } from "lucide-react";
import { acceptDocuments, hasPriorConsent, type AuthError } from "@guf/api";
import { consentRequirements, consentSourceFor, formatDayMonthYear, LEGAL_DOCUMENTS, legalDocumentLabel, legalReaderTarget } from "@guf/core";
import { Banner, Button, Checkbox, Icon, Logo } from "@/components/ds";
import { usePendingDocuments, useSignupDocuments } from "@/hooks/use-pending-documents";
import { LEGAL_OVERVIEW_KEY } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { LegalDocLink } from "@/components/legal/legal-reader-provider";
import { LEGAL_ICONS, LegalChanges } from "@/components/legal/legal-ui";
import { LegalLink } from "./auth-screen";

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
  // Links da confirmação: o documento pendente; se não estiver pendente, a versão vigente.
  const current = useSignupDocuments();
  const docUrl = (type: "terms" | "privacy") =>
    docs.find((d) => d.doc_type === type)?.url ?? current.data?.[type].url;
  const allChecked = (!needsAge || ageChecked) && (!needsTerms || termsChecked);
  // Só a confirmação do que está pendente (ex.: só a Política mudou → "Li e aceito a Política…").
  const termsPending = docs.some((d) => d.doc_type === "terms");
  const privacyPending = docs.some((d) => d.doc_type === "privacy");
  // Já aceitou antes: é uma versão nova ("Documento atualizado" + o que mudou, quando o app souber).
  const reaccept = prior.data === true;
  const changes = docs.flatMap((d) => {
    const target = legalReaderTarget(d.doc_type);
    return target ? (LEGAL_DOCUMENTS[target.doc].changes[d.version] ?? []) : [];
  });

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
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-documents"] }),
        queryClient.invalidateQueries({ queryKey: [LEGAL_OVERVIEW_KEY] }),
      ]),
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
        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">
          {reaccept ? (docs.length > 1 ? "Documentos atualizados" : "Documento atualizado") : "Antes de continuar"}
        </h1>
        <p className="m-0 max-w-[320px] text-base leading-6 text-pretty text-fg-secondary">
          {reaccept
            ? "Para continuar usando o guf, leia e aceite a nova versão. Seus treinos não são afetados."
            : "Para usar o guf, leia e confirme os documentos abaixo."}
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
            {docs.map((d) => {
              const target = legalReaderTarget(d.doc_type);
              const label = legalDocumentLabel(d.doc_type);
              return (
                <li key={d.id} className="flex min-h-[72px] items-center gap-3 rounded-lg border border-border bg-surface py-3 pr-2 pl-3.5">
                  <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                    <Icon icon={target ? LEGAL_ICONS[LEGAL_DOCUMENTS[target.doc].icon] : FileText} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                    <span className="text-[15px] leading-[22px] font-semibold">{label}</span>
                    <span className="text-[13px] leading-[18px] text-fg-secondary">
                      Versão {d.version} · em vigor desde {formatDayMonthYear(new Date(d.published_at))}
                    </span>
                  </span>
                  <LegalDocLink
                    docType={d.doc_type}
                    url={d.url}
                    aria-label={`Ler ${label}`}
                    className="flex h-11 min-w-11 items-center gap-1.5 rounded-md px-3 text-[15px] font-semibold text-accent-text no-underline hover:bg-surface-3"
                  >
                    Ler
                    <Icon icon={ChevronRight} size={16} />
                  </LegalDocLink>
                </li>
              );
            })}
          </ul>
        )}

        {reaccept && <LegalChanges items={changes} />}

        {ready && docs.length > 0 && (
          <div className="flex flex-col gap-1">
            {needsAge && (
              <Checkbox checked={ageChecked} onChange={(e) => setAgeChecked(e.target.checked)}>
                Tenho 18 anos ou mais · <LegalLink docType="age_declaration">ler a declaração de idade</LegalLink>
              </Checkbox>
            )}
            {needsTerms && (
              <Checkbox checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)}>
                {termsPending && !privacyPending ? (
                  <>
                    Li e aceito os <LegalLink docType="terms" url={docUrl("terms")}>Termos de Uso</LegalLink>
                  </>
                ) : privacyPending && !termsPending ? (
                  <>
                    Li e aceito a <LegalLink docType="privacy" url={docUrl("privacy")}>Política de Privacidade</LegalLink>
                  </>
                ) : (
                  <>
                    Li e aceito os <LegalLink docType="terms" url={docUrl("terms")}>Termos de Uso</LegalLink> e a{" "}
                    <LegalLink docType="privacy" url={docUrl("privacy")}>Política de Privacidade</LegalLink>
                  </>
                )}
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
