"use client";

import { Button } from "@guf/ui";
import { FORM_SHORTCUT_HINTS, GLOBAL_SHORTCUT_HINTS, type KeyboardHint } from "@/shared/helpers/shortcuts";
import { Dialog } from "@/shared/components/dialog";
import { KbdKeys } from "@/shared/components/keyboard-hints";
import { SectionTitle } from "@/shared/components/panel";
import { useScreenHints } from "@/shared/libs/shortcut-hints";

function HintTable({ id, title, hints }: { id: string; title: string; hints: readonly KeyboardHint[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <SectionTitle id={id}>{title}</SectionTitle>
      <dl className="m-0 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {hints.map((hint) => (
          <div key={`${hint.keys.join("+")}-${hint.label}`} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
            {/* Teclas são o termo (dt) e a ação a definição (dd); na tela, a ação vem primeiro. */}
            <dt className="order-2 flex flex-none items-center gap-1">
              <KbdKeys keys={hint.keys} />
            </dt>
            <dd className="m-0 text-fg-secondary first-letter:uppercase">{hint.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Ajuda "?": os atalhos desta tela, os de qualquer tela e como os formulários respondem ao teclado. */
export function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  const screenHints = useScreenHints();
  return (
    <Dialog open title="Atalhos de teclado" subtitle="Teclas de uma letra não funcionam enquanto você digita num campo." onClose={onClose} showClose>
      {screenHints.length > 0 && <HintTable id="atalhos-tela" title="Nesta tela" hints={screenHints} />}
      <HintTable id="atalhos-geral" title="Em qualquer tela" hints={GLOBAL_SHORTCUT_HINTS} />
      <HintTable id="atalhos-formularios" title="Em formulários e diálogos" hints={FORM_SHORTCUT_HINTS} />
      <Button variant="secondary" size="tall" fullWidth onClick={onClose}>
        Fechar
      </Button>
    </Dialog>
  );
}
