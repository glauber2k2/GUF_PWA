"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { getSupabaseClient } from "@/lib/supabase";
// Trocar por "@guf/api" na integração com o Supabase (mesma assinatura).
import { signUpWithEmail } from "@/mocks/auth";
import { AuthFooter, AuthLink, AuthScreen } from "./auth-screen";
import { useGoogleSignIn } from "./use-google-sign-in";

const LEGAL_LINK = "font-medium underline hover:underline";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const google = useGoogleSignIn(setFormError);
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

  // LGPD: "Criar conta" só habilita com as duas confirmações marcadas.
  const [isAdult, acceptsTerms] = useWatch({ control, name: ["isAdult", "acceptsTerms"] });
  const consentsGiven = isAdult && acceptsTerms;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setNotice(null);
    const { data, error } = await signUpWithEmail(getSupabaseClient(), values);
    if (error) {
      if (error.code === "email_already_registered") setError("email", { message: error.message });
      else if (error.code === "weak_password") setError("password", { message: error.message });
      else setFormError(error.message);
      return;
    }
    if (data.needsEmailConfirmation) {
      setNotice("confirme seu e-mail pelo link enviado e depois entre.");
      return;
    }
    router.replace("/");
  });

  const busy = isSubmitting || google.pending;

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
            Tenho 18 anos ou mais
          </Checkbox>
          <Checkbox error={errors.acceptsTerms?.message} {...register("acceptsTerms")}>
            Li e aceito os{" "}
            <AuthLink href="/legal?doc=termos" prefetch={false} target="_blank" rel="noopener" className={LEGAL_LINK}>
              Termos de Uso
            </AuthLink>{" "}
            e a{" "}
            <AuthLink
              href="/legal?doc=privacidade"
              prefetch={false}
              target="_blank"
              rel="noopener"
              className={LEGAL_LINK}
            >
              Política de Privacidade
            </AuthLink>
          </Checkbox>
        </div>
        {formError && <Banner tone="danger">{formError}</Banner>}
        {notice && (
          <Banner tone="success" title="Conta criada">
            {notice}
          </Banner>
        )}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={!consentsGiven || google.pending}>
          {isSubmitting ? "Criando conta" : "Criar conta"}
        </Button>
        <AuthFooter question="Já tem conta?" className="min-h-9">
          <AuthLink href="/login">Entrar</AuthLink>
        </AuthFooter>
      </form>
    </AuthScreen>
  );
}
