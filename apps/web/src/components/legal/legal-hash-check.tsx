"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentLegalHashes } from "@guf/api";
import { LEGAL_DOCUMENTS, legalContentHashes, legalHashMismatches } from "@guf/core";
import { Banner } from "@/components/ds";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Só desenvolvimento: avisa quando legal_documents.content_hash não confere com o texto
 * de legal-content.ts (o aceite gravado provaria um texto diferente do exibido).
 * Corrigir com nova migration usando `pnpm --filter @guf/core legal:hashes`.
 */
export function LegalHashCheck() {
  const check = useQuery({
    queryKey: ["legal-hash-check"],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const [stored, expected] = await Promise.all([
        getCurrentLegalHashes(getSupabaseClient()),
        legalContentHashes(LEGAL_DOCUMENTS),
      ]);
      if (stored.error) throw stored.error;
      return legalHashMismatches(expected, stored.data);
    },
  });

  if (!check.data?.length) return null;
  return (
    <Banner tone="warning" title="Hash diferente (dev)">
      o texto do app mudou e não confere com a versão vigente no banco: {check.data.join(", ")}. Gere os hashes
      com legal:hashes e publique por migration.
    </Banner>
  );
}
