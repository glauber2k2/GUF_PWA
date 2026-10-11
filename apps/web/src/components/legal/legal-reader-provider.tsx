"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LEGAL_DOCUMENTS, legalReaderTarget, type LegalReaderDoc } from "@guf/core";
import { ScreenPortal } from "@/components/ds";
import { useAuth } from "@/providers/auth-provider";
import { LegalReader } from "./legal-reader";

/** Perfil › Privacidade (exportar, excluir conta, revogar consentimento). */
export const PRIVACY_SETTINGS_PATH = "/perfil#pf-privacy";

interface OpenReader {
  key: number;
  doc: LegalReaderDoc;
  anchor?: string;
}

interface LegalReaderApi {
  /** Abre o documento por cima da tela atual (a tela continua como estava ao voltar). */
  openLegal: (doc: LegalReaderDoc, anchor?: string) => void;
}

const LegalReaderContext = createContext<LegalReaderApi | null>(null);

export function useLegalReader(): LegalReaderApi {
  const ctx = useContext(LegalReaderContext);
  if (!ctx) throw new Error("useLegalReader precisa estar dentro de <LegalReaderProvider>.");
  return ctx;
}

/**
 * Leitor de documentos DENTRO do app: abre por cima da tela (portal, z-55: acima de telas cheias,
 * abaixo das folhas), sem trocar de rota — o cadastro e o /aceite mantêm o que foi digitado e marcado.
 * Cada leitor aberto entra no histórico: o voltar do sistema (Android/navegador) fecha o de cima.
 */
export function LegalReaderProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [stack, setStack] = useState<OpenReader[]>([]);
  const seq = useRef(0);
  const depth = useRef(0);

  useEffect(() => {
    depth.current = stack.length;
  }, [stack.length]);

  // Voltar do sistema: fecha o leitor de cima.
  useEffect(() => {
    const onPop = () => {
      if (depth.current > 0) setStack((s) => s.slice(0, -1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openLegal = useCallback((doc: LegalReaderDoc, anchor?: string) => {
    window.history.pushState(window.history.state, "", window.location.href);
    setStack((s) => [...s, { key: ++seq.current, doc, anchor }]);
  }, []);

  const back = useCallback(() => window.history.back(), []);

  const goToPrivacy = useCallback(() => {
    // Sai do leitor (as entradas dele ficam no histórico como a própria tela) e abre o Perfil.
    setStack([]);
    router.push(PRIVACY_SETTINGS_PATH);
  }, [router]);

  const api = useMemo(() => ({ openLegal }), [openLegal]);

  return (
    <LegalReaderContext.Provider value={api}>
      {children}
      {stack.length > 0 && (
        <ScreenPortal>
          {stack.map((reader, i) => (
            <LegalReader
              key={reader.key}
              doc={reader.doc}
              anchor={reader.anchor}
              backLabel={i > 0 ? "Voltar ao documento anterior" : user ? "Voltar" : "Voltar à tela anterior"}
              onBack={back}
              onOpenDoc={openLegal}
              onAction={goToPrivacy}
              // Só o de cima fica visível e acessível.
              className={i === stack.length - 1 ? "z-[55] animate-guf-in-right" : "invisible z-[55]"}
            />
          ))}
        </ScreenPortal>
      )}
    </LegalReaderContext.Provider>
  );
}

/**
 * Link para um documento legal pelo doc_type ou pela URL publicada (legal_documents.url):
 * abre o leitor no app em vez de nova aba. Dentro de um Checkbox, abre sem marcar a caixa
 * (ler nunca marca a confirmação sozinho).
 */
export function LegalDocLink({
  docType,
  url,
  className,
  children,
  ...rest
}: {
  docType: string;
  /** URL publicada (ex.: "/termos#idade"): usada só como href. */
  url?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { openLegal } = useLegalReader();
  const target = legalReaderTarget(docType);
  if (!target) return <span className={className}>{children}</span>;
  const href = url ?? LEGAL_DOCUMENTS[target.doc].route + (target.anchor ? `#${target.anchor}` : "");
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    openLegal(target.doc, target.anchor);
  };
  return (
    <a href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  );
}
