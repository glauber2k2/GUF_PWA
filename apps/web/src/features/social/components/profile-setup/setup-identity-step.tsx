import { useId } from "react";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { TextField } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import type { SetupHandleStatus, SetupIdentity } from "@/features/social/hooks/use-setup-identity";
import { SetupStepTitle } from "./setup-step-title";

const STATUS_MESSAGES: Record<SetupHandleStatus, (handle: string) => string> = {
  generated: () => "Criamos esse nome para você. Pode trocar agora ou depois.",
  same: () => "Este é o seu @ atual.",
  checking: () => "Verificando disponibilidade…",
  available: (handle) => `Disponível · @${handle}`,
  taken: (handle) => `@${handle} já está em uso. Tente uma das opções abaixo.`,
  invalid: () => "Use de 3 a 20 caracteres: letras, números, ponto ou _ (sem começar ou terminar com ponto ou _).",
  unknown: () => "Não deu para conferir agora. Confirmamos ao continuar.",
};

const isProblem = (status: SetupHandleStatus) => status === "taken" || status === "invalid";

/** Passo 1 · nome e @ (protótipo "Cadastro Passo a Passo" · 1a/1b). */
export function SetupIdentityStep({ identity }: { identity: SetupIdentity }) {
  const handleId = useId();
  const { status } = identity;
  return (
    <div className="flex flex-col gap-7">
      <SetupStepTitle title="Como você quer ser chamado?" subtitle="Seu nome aparece no perfil e no ranking entre amigos." />
      <TextField
        label="Nome"
        value={identity.name}
        onChange={(e) => identity.setName(e.target.value)}
        placeholder="Ex.: Ana Ribeiro"
        autoComplete="name"
      />
      <div className="flex flex-col gap-2">
        <label htmlFor={handleId} className="text-[13px] font-medium text-fg-secondary">
          Nome de usuário
        </label>
        <div
          className={cn(
            "flex h-[52px] items-center rounded-md border-[1.5px] bg-surface pr-1.5 pl-3.5 transition-[border-color,box-shadow] duration-150 ease-standard focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/30",
            isProblem(status) ? "border-danger" : status === "available" ? "border-success" : "border-border-strong",
          )}
        >
          <span className="text-base font-semibold text-fg-muted">@</span>
          <input
            id={handleId}
            value={identity.handle}
            onChange={(e) => identity.setHandle(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={`${handleId}-status`}
            aria-invalid={isProblem(status) || undefined}
            className="h-full min-w-0 flex-1 bg-transparent pr-1.5 pl-0.5 text-base font-medium text-fg outline-none"
          />
          <HandleStatusIcon status={status} />
        </div>
        <span
          id={`${handleId}-status`}
          aria-live="polite"
          className={cn("min-h-[18px] text-[13px] leading-[18px]", isProblem(status) ? "text-danger" : status === "available" ? "text-success" : "text-fg-muted")}
        >
          {STATUS_MESSAGES[status](identity.handle)}
        </span>
        {identity.suggestions.length > 0 && (
          <div className="mt-1 flex animate-guf-rise-fast flex-col gap-2">
            <span className="text-xs font-semibold text-fg-muted">{status === "taken" ? "Disponíveis" : "Sugestões com seu nome"}</span>
            <div className="flex flex-wrap gap-2">
              {identity.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => identity.setHandle(suggestion)}
                  className="h-9 cursor-pointer rounded-pill border border-border-strong bg-surface px-3 text-sm font-medium text-fg transition-colors duration-150 ease-standard hover:border-accent-text active:scale-96"
                >
                  @{suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HandleStatusIcon({ status }: { status: SetupHandleStatus }) {
  return (
    <span aria-hidden="true" className="grid size-9 flex-none place-items-center">
      {status === "checking" && <LoaderCircle size={18} className="animate-guf-spin text-fg-muted motion-reduce:animate-none" />}
      {status === "available" && (
        <span className="grid size-6 animate-guf-pop place-items-center rounded-pill bg-success text-background">
          <Check size={14} />
        </span>
      )}
      {isProblem(status) && <CircleAlert size={20} className="text-danger" />}
    </span>
  );
}
