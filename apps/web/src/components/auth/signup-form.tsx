"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpWithEmail, type AuthError } from "@guf/api";
import { signUpSchema } from "@guf/schemas";
import {
  Banner,
  Button,
  Checkbox,
  GoogleButton,
  Logo,
  PasswordField,
  TextDivider,
  TextField,
} from "@/components/ds";
import { useSignupDocuments } from "@/hooks/use-pending-documents";
import { getSupabaseClient } from "@/lib/supabase";
import { AuthFooter, AuthLink, AuthScreen, LegalLink } from "./auth-screen";
import { useGoogleSignIn } from "./use-google-sign-in";

export function SignUpForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const google = useGoogleSignIn(setFormError);
  const documents = useSignupDocuments();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    // LGPD: as duas confirmações sempre começam desmarcadas.
    defaultValues: { name: "", email: "", password: "", isAdult: false, acceptsTerms: false },
    mode: "onTouched",
  });

  // LGPD: "Criar conta" só habilita com as duas confirmações marcadas e os documentos carregados.
  const [isAdult, acceptsTerms] = useWatch({ control, name: ["isAdult", "acceptsTerms"] });
  const docs = documents.data;
  const canSubmit = isAdult && acceptsTerms && Boolean(docs);

  const onSubmit = handleSubmit(async (values) => {
    if (!docs) return;
    setFormError(null);
    setNotice(null);
    const { data, error } = await signUpWithEmail(getSupabaseClient(), {
      ...values,
      // Ids das versões exibidas nesta tela quando o usuário marcou as confirmações.
      acceptedDocumentIds: [docs.terms.id, docs.privacy.id, docs.age_declaration.id],
      emailRedirectTo: `${window.location.origin}/`,
      platform: "web",
    });
    if (error) {
      if (error.code === "email_already_registered") setError("email", { message: error.message });
      else if (error.code === "weak_password") setError("password", { message: error.message });
      else setFormError(error.message);
      return;
    }
    // Com sessão, o guarda leva para o app; sem sessão, falta confirmar o e-mail.
    if (data.needsEmailConfirmation) {
      setNotice("confirme seu e-mail pelo link enviado para a sua caixa de entrada.");
    }
  });

  const busy = isSubmitting || google.pending;
  const documentsError = documents.error as AuthError | null;

  return (
    <AuthScreen
      variant="signup"
      hero={
        <>
          <Logo size="lg" wordmark={false} />
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Criar conta</h1>
          <p className="m-0 text-base leading-6 text-fg-secondary">Leva menos de um minuto.</p>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <GoogleButton onClick={google.start} disabled={busy} aria-busy={google.pending || undefined} />
        <TextDivider />
        <TextField
          label="Nome"
          autoComplete="name"
          placeholder="Seu nome"
          size="lg"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          size="lg"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordField
          label="Senha"
          placeholder="Crie uma senha"
          autoComplete="new-password"
          size="lg"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex flex-col gap-1">
          <Checkbox error={errors.isAdult?.message} {...register("isAdult")}>
            Tenho 18 anos ou mais · <LegalLink docType="age_declaration" url={docs?.age_declaration.url}>ler a declaração de idade</LegalLink>
          </Checkbox>
          <Checkbox error={errors.acceptsTerms?.message} {...register("acceptsTerms")}>
            Li e aceito os <LegalLink docType="terms" url={docs?.terms.url}>Termos de Uso</LegalLink> e a{" "}
            <LegalLink docType="privacy" url={docs?.privacy.url}>Política de Privacidade</LegalLink>
          </Checkbox>
        </div>
        {documentsError && (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void documents.refetch()}>
            {documentsError.message}
          </Banner>
        )}
        {formError && <Banner tone="danger">{formError}</Banner>}
        {notice && (
          <Banner tone="success" title="Conta criada">
            {notice}
          </Banner>
        )}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={!canSubmit || google.pending}>
          {isSubmitting ? "Criando conta" : "Criar conta"}
        </Button>
        <AuthFooter question="Já tem conta?" className="min-h-9">
          <AuthLink href="/login">Entrar</AuthLink>
        </AuthFooter>
      </form>
    </AuthScreen>
  );
}
