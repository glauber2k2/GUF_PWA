"use client";

import { Logo } from "@/components/ds";
import { usePendingDocuments } from "@/hooks/use-pending-documents";
import { SignOutButton } from "./sign-out-button";

const DOC_LABELS: Record<string, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  age_declaration: "Declaração de idade",
};

/** MARCADOR do portão /aceite: lista o que está pendente. A tela real vem com o design. */
export function ConsentPlaceholder() {
  const { data = [] } = usePendingDocuments();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo size="md" wordmark={false} />
      <h1 className="m-0 text-[22px] leading-7 font-semibold">Aceite pendente</h1>
      <p className="m-0 text-sm text-fg-secondary">
        Esta tela ainda está em construção. Documentos que faltam aceitar:
      </p>
      <ul className="m-0 grid gap-1 p-0 text-sm">
        {data.map((d) => (
          <li key={d.id} className="list-none">
            {DOC_LABELS[d.doc_type] ?? d.doc_type} · versão {d.version}
          </li>
        ))}
      </ul>
      <SignOutButton />
    </main>
  );
}
