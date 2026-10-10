import type { ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Moldura das telas de acesso: coluna mobile (até 430px, centralizada no desktop),
 * marca/título no centro da área livre e o formulário na metade inferior (zona do polegar).
 */
export function AuthScreen({
  hero,
  children,
  variant,
}: {
  hero: ReactNode;
  children: ReactNode;
  /** login: mais respiro no topo; signup: mais compacto (formulário maior). */
  variant: "login" | "signup";
}) {
  const login = variant === "login";
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background px-6 text-fg",
        login ? "pt-[72px] pb-8" : "pt-14 pb-6",
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center text-center",
          login ? "gap-5 pb-6" : "gap-3 pb-5",
        )}
      >
        {hero}
      </div>
      {children}
    </main>
  );
}

/** Link de texto das telas de acesso (volt, sem sublinhado; sublinha no hover). */
export function AuthLink({
  className,
  children,
  ...props
}: LinkProps & { className?: string; children: ReactNode; target?: string; rel?: string }) {
  return (
    <Link {...props} className={cn("font-semibold text-accent-text no-underline hover:underline", className)}>
      {children}
    </Link>
  );
}

/** Rodapé "Não tem conta? Criar conta" / "Já tem conta? Entrar". */
export function AuthFooter({ question, children, className }: { question: string; children: ReactNode; className?: string }) {
  return (
    <p className={cn("m-0 flex items-center justify-center gap-1.5 text-sm text-fg-secondary", className)}>
      <span>{question}</span>
      {children}
    </p>
  );
}

/**
 * Link para um documento legal (URL publicada em legal_documents), em nova aba.
 * Dentro de um Checkbox, abre o documento sem marcar a caixa (input nativo + label).
 */
export function LegalLink({ href, children }: { href: string | undefined; children: ReactNode }) {
  if (!href) return <span className="font-medium">{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text underline">
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}
