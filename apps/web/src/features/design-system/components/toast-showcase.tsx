"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Info, Play, Save, Trash2, Trophy, WifiOff, type LucideIcon } from "lucide-react";
import { Button, Toast, ToastStack } from "@/shared/components/ds";
import { createToastStore, TOAST_DURATION_MS, type ToastOptions, type ToastTone } from "@/store/global/toast.store";

type Sample = { label: string; when: string; title: string; options: ToastOptions };

const SAMPLES: Record<ToastTone, Sample> = {
  success: { label: "Sucesso", when: "Ação concluída", title: "Treino salvo", options: { tone: "success", message: "Já está no seu histórico." } },
  error: {
    label: "Erro",
    when: "Falha com saída",
    title: "Não foi possível salvar",
    options: { tone: "error", message: "Verifique a internet e tente de novo.", actionLabel: "Tentar" },
  },
  warning: {
    label: "Aviso",
    when: "Atenção, sem bloqueio",
    title: "Sem conexão",
    options: { tone: "warning", icon: WifiOff, message: "Seu treino está salvo no aparelho." },
  },
  info: { label: "Informativo", when: "Explicação neutra", title: "Dica", options: { tone: "info", message: "Toque em + para subir a carga de 2 em 2 kg." } },
  pr: { label: "Recorde", when: "Conquista, sempre com troféu", title: "Recorde pessoal", options: { tone: "pr", message: "Supino reto – 82,5 kg × 8" } },
  undo: { label: "Desfazer", when: "Ação reversível", title: "Série excluída", options: { tone: "undo", icon: Trash2, actionLabel: "Desfazer" } },
  loading: { label: "Carregando", when: "Vira sucesso ao concluir", title: "Salvando treino…", options: { tone: "loading" } },
};

const FIRE: Array<{ key: keyof typeof SAMPLES; label: string; icon: LucideIcon }> = [
  { key: "success", label: "Sucesso", icon: CircleCheck },
  { key: "error", label: "Erro", icon: CircleAlert },
  { key: "warning", label: "Aviso", icon: WifiOff },
  { key: "info", label: "Dica", icon: Info },
  { key: "pr", label: "Recorde", icon: Trophy },
  { key: "undo", label: "Desfazer", icon: Trash2 },
];

/** Vitrine do Toast: os tipos (estáticos) e a pilha ao vivo dentro de um "celular". */
export function ToastShowcase() {
  const [store] = useState(() => createToastStore(TOAST_DURATION_MS));

  const fire = (key: keyof typeof SAMPLES) => {
    const { title, options } = SAMPLES[key];
    if (key === "undo") {
      return store.show(title, { ...options, onAction: () => store.show("Série restaurada", { tone: "success" }) });
    }
    if (key === "error") {
      return store.show(title, { ...options, onAction: () => fire("loading") });
    }
    const id = store.show(title, options);
    if (key === "loading") setTimeout(() => store.update(id, "Treino salvo", SAMPLES.success.options), 1900);
    return id;
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {(Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>).map((key) => {
          const s = SAMPLES[key];
          return (
            <div key={key} className="grid gap-1.5">
              <div className="flex justify-between gap-3 text-[13px] leading-[18px]">
                <span className="font-semibold">{s.label}</span>
                <span className="text-fg-muted">{s.when}</span>
              </div>
              <Toast title={s.title} {...s.options} animate={false} onClose={key === "loading" ? undefined : () => {}} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FIRE.map((f) => (
          <Button key={f.key} variant="secondary" icon={f.icon} fullWidth onClick={() => fire(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>
      <Button variant="secondary" icon={Save} fullWidth onClick={() => fire("loading")}>
        Salvando → salvo
      </Button>
      <Button
        icon={Play}
        fullWidth
        onClick={() => (["loading", "pr", "warning"] as const).forEach((k, i) => setTimeout(() => fire(k), i * 900))}
      >
        Disparar sequência
      </Button>

      {/* Pilha ao vivo: passe o mouse para expandir e pausar; arraste para o lado para dispensar. */}
      <div className="relative h-[360px] overflow-hidden rounded-lg border border-border bg-background">
        <ToastStack store={store} duration={TOAST_DURATION_MS} className="absolute inset-x-3 bottom-4" />
      </div>
    </div>
  );
}
