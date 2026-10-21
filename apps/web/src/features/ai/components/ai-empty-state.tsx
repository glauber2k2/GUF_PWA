import { Icon } from "@/shared/components/ds";
import { AI_SUGGESTIONS } from "@/features/ai/constants/suggestions";
import { AiMark } from "@/features/ai/components/ai-mark";

interface AiEmptyStateProps {
  greeting: string;
  isDisabled: boolean;
  onAsk: (text: string) => void;
}

/** Conversa vazia: saudação, aviso de privacidade e quatro perguntas prontas. */
export function AiEmptyState({ greeting, isDisabled, onAsk }: AiEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-7 pb-1">
      <div className="flex animate-guf-rise flex-col items-center gap-4 text-center">
        <span className="grid size-[72px] animate-guf-ai-float place-items-center rounded-[22px] bg-ai-tint text-accent-text">
          <AiMark size={44} />
        </span>
        <div className="flex max-w-[300px] flex-col gap-1.5">
          <h2 className="text-2xl leading-[30px] font-bold tracking-[-0.02em]">{greeting}</h2>
          <p className="text-[15px] leading-[22px] text-pretty text-fg-secondary">
            Pergunte sobre treinos, cargas, descanso ou sua evolução. As respostas usam o seu histórico.
          </p>
          <p className="text-[12px] leading-4 text-pretty text-fg-muted">
            Sua pergunta e os dados de treino usados na resposta vão para o provedor de IA sem seu nome nem e-mail. Não
            escreva dados pessoais ou de saúde.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {AI_SUGGESTIONS.map(({ icon, text }, index) => (
          <button
            key={text}
            type="button"
            disabled={isDisabled}
            onClick={() => onAsk(text)}
            // Atraso escalonado da entrada de cada atalho (valor dinâmico).
            style={{ animationDelay: `${220 + index * 50}ms` }}
            className="flex animate-guf-rise cursor-pointer flex-col items-start gap-2.5 rounded-lg border border-border bg-surface p-3.5 text-left text-sm leading-[19px] font-medium text-fg transition-[background,transform] duration-150 ease-standard hover:bg-surface-elevated active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-ai-tint text-accent-text">
              <Icon icon={icon} size={16} />
            </span>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
