"use client";

import { useState } from "react";
import { passwordFormStatus, type PasswordFormMode } from "@guf/core";

/**
 * Estado do formulário de senha nova (redefinir pelo link ou alterar logado): os três campos,
 * a recusa da senha atual (que faz o campo tremer de novo a cada recusa) e "Sair dos outros
 * aparelhos". O que falta e o progresso vêm de `passwordFormStatus` (core).
 */
export function usePasswordForm(mode: PasswordFormMode) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isCurrentRejected, setCurrentRejected] = useState(false);
  const [rejectionCount, setRejectionCount] = useState(0);
  const [signsOutOthers, setSignsOutOthers] = useState(true);

  const status = passwordFormStatus({ mode, current, next, confirm, isCurrentRejected, signsOutOthers });

  const changeCurrent = (value: string) => {
    setCurrent(value);
    setCurrentRejected(false);
  };

  /** O servidor recusou a senha atual: nova senha e confirmação ficam, para não redigitar. */
  const rejectCurrent = () => {
    setCurrentRejected(true);
    setRejectionCount((count) => count + 1);
  };

  return {
    current,
    next,
    confirm,
    changeCurrent,
    setNext,
    setConfirm,
    isCurrentRejected,
    rejectionCount,
    rejectCurrent,
    signsOutOthers,
    setSignsOutOthers,
    status,
  };
}

export type PasswordForm = ReturnType<typeof usePasswordForm>;
