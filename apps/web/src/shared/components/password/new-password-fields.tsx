"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { PasswordInputField } from "@/shared/components/password/password-input-field";
import { PasswordStrengthPanel } from "@/shared/components/password/password-strength-panel";
import type { PasswordForm } from "@/shared/hooks/use-password-form";

/** Nova senha (com força e requisitos) e confirmação: iguais em redefinir e alterar. */
export function NewPasswordFields({ form }: { form: PasswordForm }) {
  const { status } = form;
  return (
    <>
      <PasswordInputField
        id="password-new"
        label="Nova senha"
        value={form.next}
        onChange={form.setNext}
        icon={KeyRound}
        autoComplete="new-password"
        placeholder="Crie uma senha forte"
        isOk={status.isStrong && !status.isSameAsCurrent}
        error={status.isSameAsCurrent ? "A nova senha precisa ser diferente da atual." : null}
      >
        <PasswordStrengthPanel password={form.next} requirementsMet={status.requirementsMet} />
      </PasswordInputField>
      <PasswordInputField
        id="password-confirm"
        label="Confirmar nova senha"
        value={form.confirm}
        onChange={form.setConfirm}
        icon={ShieldCheck}
        autoComplete="new-password"
        placeholder="Digite a nova senha de novo"
        isOk={status.isMatch}
        error={status.isMismatch ? "As senhas não coincidem. Confira letra por letra." : null}
        success={status.isMatch ? "As senhas coincidem" : null}
      />
    </>
  );
}
