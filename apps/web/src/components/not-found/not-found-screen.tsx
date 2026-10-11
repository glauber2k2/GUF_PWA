"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { House, LogIn } from "lucide-react";
import { Button, GufLoader, Logo } from "@/components/ds";
import { useAuth } from "@/providers/auth-provider";

/** Segundos até o redirecionamento automático (pode ser pausado em "Ficar aqui"). */
const REDIRECT_SECONDS = 10;

/**
 * Página não encontrada (404). Logado → leva ao Início; sem login → ao login.
 * Redireciona sozinha em 10 s, a não ser que o usuário toque em "Ficar aqui".
 */
export function NotFoundScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const logged = Boolean(user);
  const [left, setLeft] = useState(REDIRECT_SECONDS);
  const [stopped, setStopped] = useState(false);
  const [clicked, setClicked] = useState(false);
  const target = logged ? "/" : "/login";
  const leaving = clicked || left === 0;

  const go = () => {
    setClicked(true);
    router.replace(target);
  };

  // Contagem só depois de saber se há sessão (o destino depende disso).
  useEffect(() => {
    if (isLoading || stopped || leaving) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [isLoading, stopped, leaving, setLeft]);

  // Contagem chegou a zero: vai para o Início (logado) ou para o login.
  useEffect(() => {
    if (left === 0) router.replace(target);
  }, [left, router, target]);

  const destination = logged ? "o Início" : "o login";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background pt-[env(safe-area-inset-top)] text-fg">
      <header className="flex h-[52px] flex-none items-center justify-center">
        <Logo className="h-6" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-6 pb-6 text-center">
        <div
          role="img"
          aria-label="404: o ponto do anel do guf escapou e está procurando o caminho de volta"
          className="flex animate-guf-rise items-center justify-center gap-1.5"
        >
          <span aria-hidden="true" className="font-display text-[148px] leading-none font-bold tracking-[-0.02em] tabular-nums">
            4
          </span>
          <EscapedRing />
          <span aria-hidden="true" className="font-display text-[148px] leading-none font-bold tracking-[-0.02em] tabular-nums">
            4
          </span>
        </div>

        <div className="flex animate-guf-rise flex-col items-center gap-2.5 [animation-delay:80ms]">
          <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Erro 404</span>
          <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">Página não encontrada</h1>
          <p className="m-0 max-w-[300px] text-[15px] leading-[22px] text-pretty text-fg-secondary">
            {logged
              ? "O endereço pode ter mudado ou não existe mais. Seus treinos continuam salvos."
              : "O endereço pode ter mudado ou não existe mais. Entre na sua conta para continuar."}
          </p>
        </div>
      </main>

      <div className="flex flex-none animate-guf-rise flex-col items-stretch gap-3 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] [animation-delay:160ms]">
        <Button size="lg" icon={logged ? House : LogIn} fullWidth onClick={go}>
          {logged ? "Voltar ao início" : "Ir para o login"}
        </Button>
        {stopped ? (
          <span className="flex min-h-11 items-center justify-center text-sm text-fg-muted">Redirecionamento automático pausado</span>
        ) : (
          <div className="flex min-h-11 items-center justify-center gap-1 text-sm text-fg-secondary">
            <span aria-live="polite" className="tabular-nums">
              {isLoading ? "Verificando sua sessão…" : `Indo para ${destination} em ${left} s`}
            </span>
            <button
              type="button"
              onClick={() => setStopped(true)}
              className="h-11 cursor-pointer rounded-md bg-transparent px-2.5 text-sm font-semibold text-accent-text hover:bg-surface-3"
            >
              Ficar aqui
            </button>
          </div>
        )}
      </div>

      {leaving && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background">
          <GufLoader variant={2} size={56} layout="column" text={logged ? "Abrindo o Início" : "Abrindo o login"} />
        </div>
      )}
    </div>
  );
}

/** O "0" do 404: anel do guf girando e o ponto escapando, quicando e voltando (keyframes guf-404-* em base.css). */
function EscapedRing() {
  return (
    <svg viewBox="-2 -6 64 66" width={118} height={122} aria-hidden="true" className="mt-2 block overflow-visible">
      <ellipse cx={50} cy={52} rx={6} ry={1.6} className="animate-guf-404-shadow fill-fg opacity-0 [transform-box:fill-box] origin-center" />
      <g className="animate-guf-404-ring [transform-box:view-box] origin-[24px_24px]">
        <circle
          cx={24}
          cy={24}
          r={16}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray="78.2 200"
          transform="rotate(-20 24 24)"
          className="stroke-accent-text"
        />
      </g>
      <circle cx={32} cy={10.14} r={4.5} className="animate-guf-404-dot fill-accent-text" />
    </svg>
  );
}
