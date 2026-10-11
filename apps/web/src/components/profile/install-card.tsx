"use client";

import { useState } from "react";
import { Check, CircleCheck, Copy, Download, EllipsisVertical, Info, Share, Smartphone, SquarePlus, type LucideIcon } from "lucide-react";
import type { InstallPlatform } from "@guf/core";
import { useAppShell } from "@/components/app-shell/app-shell";
import { BottomSheet, Button, Icon } from "@/components/ds";
import { promptInstall, usePwaState } from "@/lib/pwa/pwa-store";

interface InstallStep {
  pre: string;
  strong: string;
  post?: string;
  icon: LucideIcon;
  chip?: string;
}

const IOS_STEPS: InstallStep[] = [
  { pre: "Toque em ", strong: "Compartilhar", post: " na barra do Safari", icon: Share },
  { pre: "Escolha ", strong: "Adicionar à Tela de Início", icon: SquarePlus },
  { pre: "Toque em ", strong: "Adicionar", post: " no canto superior", icon: Check, chip: "Adicionar" },
];

const BROWSER_STEPS: InstallStep[] = [
  { pre: "Abra o ", strong: "menu do navegador", icon: EllipsisVertical },
  { pre: "Escolha ", strong: "Instalar app", post: " ou Adicionar à tela inicial", icon: SquarePlus },
  { pre: "Confirme para ", strong: "instalar", icon: Check },
];

/**
 * "Instalar no celular" conforme o aparelho (installPlatform em @guf/core):
 * Android/Chromium → convite nativo · iPhone no Safari → 3 passos · iPhone em outro navegador →
 * "Copiar link" (no iPhone só o Safari instala) · instalado → cartão compacto · outros → passos do menu.
 */
export function InstallCard({ platform }: { platform: InstallPlatform }) {
  const shell = useAppShell();
  const { installPrompt } = usePwaState();
  const [stepsOpen, setStepsOpen] = useState(false);

  if (platform === "installed") {
    return (
      <section
        aria-label="App instalado"
        className="flex flex-none animate-guf-rise items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 [animation-delay:50ms]"
      >
        <span className="grid size-9 flex-none animate-guf-pop-badge place-items-center rounded-pill bg-accent text-accent-foreground">
          <Icon icon={Check} size={18} />
        </span>
        <div className="flex flex-col">
          <span className="text-[15px] leading-5 font-semibold">App instalado</span>
          <span className="text-[13px] leading-[18px] text-fg-secondary">Abre em tela cheia e funciona sem internet.</span>
        </div>
      </section>
    );
  }

  const iosOther = platform === "ios-other-browser";
  const install = async () => {
    // Sem o convite nativo (outros navegadores, ou simulado em desenvolvimento): mostra os passos.
    if (platform !== "android-prompt" || !installPrompt) return setStepsOpen(true);
    if (await promptInstall()) shell.showToast("guf instalado na tela inicial", { icon: CircleCheck });
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      shell.showToast("Link copiado. Cole no Safari para instalar.", { icon: Copy });
    } catch {
      shell.showToast("Não foi possível copiar. Abra o Safari e digite o endereço do guf.");
    }
  };

  return (
    <section
      aria-labelledby="pf-install-title"
      className="flex flex-none animate-guf-rise flex-col gap-3.5 rounded-lg border-[1.5px] border-accent-text bg-done-surface p-5 [animation-delay:50ms]"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-12 flex-none place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon icon={Smartphone} size={24} />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="pf-install-title" className="m-0 text-[17px] leading-[22px] font-semibold">
            Instalar no celular
          </h2>
          <span className="text-sm leading-5 text-pretty text-fg-secondary">
            {iosOther
              ? "Abra o guf no Safari para instalar. No iPhone, a instalação só funciona pelo Safari."
              : "Instale o guf: abre em tela cheia e funciona sem internet na academia."}
          </span>
        </div>
      </div>
      {iosOther ? (
        <Button variant="secondary" size="lg" icon={Copy} fullWidth onClick={() => void copyLink()}>
          Copiar link
        </Button>
      ) : (
        <Button size="lg" icon={Download} fullWidth onClick={() => void install()}>
          Instalar app
        </Button>
      )}
      <InstallStepsSheet open={stepsOpen} ios={platform === "ios-safari"} onClose={() => setStepsOpen(false)} />
    </section>
  );
}

function InstallStepsSheet({ open, ios, onClose }: { open: boolean; ios: boolean; onClose: () => void }) {
  const steps = ios ? IOS_STEPS : BROWSER_STEPS;
  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={onClose}
      title={ios ? "Instalar no iPhone" : "Instalar no celular"}
      subtitle={ios ? "3 passos no Safari" : "Pelo menu do navegador"}
    >
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map((step, i) => (
          <li
            key={step.strong}
            // Entrada escalonada (atraso dinâmico).
            style={{ animationDelay: `${i * 60}ms` }}
            className="flex animate-guf-rise-fast items-center gap-3 rounded-[14px] border border-border bg-surface p-3"
          >
            <span
              aria-hidden="true"
              className="grid size-7 flex-none place-items-center rounded-pill bg-accent font-display text-base font-bold text-accent-foreground"
            >
              {i + 1}
            </span>
            <span className="flex-1 text-[15px] leading-5">
              {step.pre}
              <strong className="font-semibold">{step.strong}</strong>
              {step.post}
            </span>
            <span
              aria-hidden="true"
              className="flex h-10 min-w-10 flex-none items-center justify-center gap-1.5 rounded-[10px] bg-surface-3 px-2.5 text-[13px] font-semibold text-info"
            >
              <Icon icon={step.icon} size={20} />
              {step.chip}
            </span>
          </li>
        ))}
      </ol>
      <span className="mt-1 flex items-center gap-2 text-[13px] leading-[18px] text-fg-secondary">
        <Icon icon={Info} size={16} className="text-fg-muted" />
        {ios ? "Funciona só pelo Safari." : "O nome da opção muda um pouco entre navegadores."}
      </span>
      <Button variant="secondary" size="lg" fullWidth onClick={onClose} className="mt-2">
        Entendi
      </Button>
    </BottomSheet>
  );
}
