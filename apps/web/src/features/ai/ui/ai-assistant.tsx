"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { m, useReducedMotion } from "motion/react";
import type { AiConversation } from "@guf/api";
import { aiGreeting } from "@guf/core";
import { AnimatePresence, GufLoader, MOTION_EASE, ScreenPortal } from "@/shared/components/ds";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { createDevicePreference } from "@/shared/preferences/device-preference";
import { useAppShell } from "@/features/app-shell";
import { useHomeSummary } from "@/features/home";
import { useLatestAiConversation } from "@/features/ai/api/use-ai";
import { AiFab } from "@/features/ai/components/ai-fab";

/** Balão "Pergunte ao GUF AI": aparece até a pessoa abrir o assistente pela primeira vez neste aparelho. */
const aiHintPreference = createDevicePreference("guf.ai-hint", ["pending", "seen"] as const, "pending");
const HINT_SHOW_MS = 1200;
const HINT_HIDE_MS = 6500;

/** Centro do botão flutuante (direita 18 + 28 px; base 94 ou 170 px + 28 px): de onde o painel abre. */
const FAB_ORIGIN_X = "calc(100% - 46px)";
const FAB_ORIGIN_Y = { normal: "calc(100% - 122px - env(safe-area-inset-bottom))", raised: "calc(100% - 198px - env(safe-area-inset-bottom))" };

/** Conversa (e o AI SDK) só baixa quando a pessoa abre o GUF AI: a Início continua leve. */
const AiChatView = dynamic(() => import("@/features/ai/components/ai-chat-view").then((mod) => mod.AiChatView), {
  ssr: false,
  loading: () => <PanelLoading />,
});

function PanelLoading() {
  return (
    <div className="grid flex-1 place-items-center">
      <GufLoader variant={8} size={32} text="Abrindo a conversa" layout="column" />
    </div>
  );
}

const newConversation = (): AiConversation => ({ id: crypto.randomUUID(), messages: [] });

/** GUF AI na Início: botão flutuante e o painel da conversa, que abre em círculo a partir dele. */
export function AiAssistant() {
  const { isMiniCardVisible } = useAppShell();
  const online = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const home = useHomeSummary();
  const [hint, setHint] = aiHintPreference.use();
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<AiConversation | null>(null);
  const latest = useLatestAiConversation(isOpen && conversation === null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Primeira abertura: retoma a última conversa; sem conversa (ou sem internet) começa uma nova.
  if (isOpen && conversation === null && (latest.isSuccess || latest.isError)) {
    setConversation(latest.data ?? newConversation());
  }

  useEffect(() => {
    if (hint !== "pending") return;
    const show = setTimeout(() => setIsHintVisible(true), HINT_SHOW_MS);
    const hide = setTimeout(() => setIsHintVisible(false), HINT_HIDE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [hint]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const open = () => {
    setIsOpen(true);
    setIsHintVisible(false);
    setHint("seen");
  };

  const close = () => {
    setIsOpen(false);
    fabRef.current?.focus({ preventScroll: true });
  };

  const origin = `${FAB_ORIGIN_X} ${isMiniCardVisible ? FAB_ORIGIN_Y.raised : FAB_ORIGIN_Y.normal}`;
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { clipPath: `circle(28px at ${origin})` },
        animate: { clipPath: `circle(150% at ${origin})`, transition: { duration: 0.46, ease: MOTION_EASE.enter } },
        exit: { clipPath: `circle(28px at ${origin})`, transition: { duration: 0.32, ease: MOTION_EASE.exit } },
      };

  return (
    <>
      <AiFab ref={fabRef} isHidden={isOpen} isHintVisible={isHintVisible} isRaised={isMiniCardVisible} onOpen={open} />
      <ScreenPortal>
        <AnimatePresence>
          {isOpen && (
            <m.section
              role="dialog"
              aria-modal="true"
              aria-label="GUF AI"
              {...panelMotion}
              className="fixed inset-x-0 inset-y-0 z-50 mx-auto flex max-w-[430px] bg-background pt-[env(safe-area-inset-top)]"
            >
              {conversation ? (
                <AiChatView
                  key={conversation.id}
                  conversation={conversation}
                  greeting={aiGreeting(home.data?.profile.name ?? null)}
                  isOnline={online}
                  onClose={close}
                  onNewChat={() => setConversation(newConversation())}
                />
              ) : (
                <PanelLoading />
              )}
            </m.section>
          )}
        </AnimatePresence>
      </ScreenPortal>
    </>
  );
}
