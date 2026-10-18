import { OFFLINE_EDIT_MESSAGE } from "@guf/core";
import { Banner } from "@/shared/components/ds";

/** Sem internet: o conteúdo continua visível, mas criar/editar projetos e rotinas fica bloqueado. */
export function OfflineEditBanner() {
  return (
    <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
      {OFFLINE_EDIT_MESSAGE}
    </Banner>
  );
}
