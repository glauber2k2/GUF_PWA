// Gera os hashes de legal_documents a partir do texto do app (packages/core/src/legal-content.ts).
// Uso: pnpm --filter @guf/core legal:hashes  (Node 22.18+ ou 24, que executa TypeScript direto)
import { LEGAL_DOCUMENTS } from "../src/legal-content.ts";
import { legalContentHashes } from "../src/legal-hash.ts";

const hashes = await legalContentHashes(LEGAL_DOCUMENTS);
for (const [type, { content, summary }] of Object.entries(hashes)) {
  console.log(`${type.padEnd(16)} content_hash = ${content}`);
  if (summary) console.log(`${"".padEnd(16)} summary_hash = ${summary}`);
}
