"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LEGAL_DOCUMENTS, type LegalReaderDoc } from "@guf/core";
import { useAuth } from "@/providers/auth-provider";
import { LegalReader } from "./legal-reader";
import { PRIVACY_SETTINGS_PATH } from "./legal-reader-provider";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/** Seção pedida na URL (/termos#idade → "idade"). */
export function useUrlHash(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => decodeURIComponent(window.location.hash.slice(1)),
    () => "",
  );
}

/** Volta para a tela anterior; aberto direto (link externo), vai para o app ou para o login. */
export function useLegalBack() {
  const router = useRouter();
  const { user } = useAuth();
  const back = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.replace(user ? "/" : "/login");
  }, [router, user]);
  return { back, backLabel: user ? "Voltar" : "Voltar ao login" };
}

/**
 * Rotas /termos, /privacidade e /termo-de-saude: o leitor como página (públicas, sem login,
 * pré-cacheadas pelo service worker — abrem sem internet).
 */
export function LegalDocumentPage({ doc }: { doc: LegalReaderDoc }) {
  const router = useRouter();
  const anchor = useUrlHash();
  const { back, backLabel } = useLegalBack();
  return (
    <LegalReader
      key={doc}
      doc={doc}
      anchor={anchor || undefined}
      backLabel={backLabel}
      onBack={back}
      onOpenDoc={(target, section) => router.push(LEGAL_DOCUMENTS[target].route + (section ? `#${section}` : ""))}
      onAction={() => router.push(PRIVACY_SETTINGS_PATH)}
    />
  );
}
