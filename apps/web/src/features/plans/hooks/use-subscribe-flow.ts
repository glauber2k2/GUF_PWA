"use client";

import type { ApiError } from "@guf/api";
import type { BillingInterval, PaymentChannel, PaymentChannelId } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useStoreSubscription } from "@/features/plans/api/use-billing";
import { useStartSubscription } from "@/features/plans/api/use-plans";
import { PlayPurchaseCanceledError, purchasePlaySubscription } from "@/features/plans/helpers/play-billing";

export interface SubscribeInput {
  planCode: string;
  interval: BillingInterval;
  acceptedDocumentIds: string[];
}

/** Como assinar num canal. A oferta chama `start` sem saber se é Stripe ou loja. */
export interface SubscribeFlow {
  start: (input: SubscribeInput, onError: (error: ApiError) => void) => void;
  isPending: boolean;
}

const PLAY_RESULT_TOASTS = {
  active: { title: "Bem-vindo ao Pro", options: { tone: "success", message: "Compra confirmada no Google Play. Tudo do Pro já está liberado." } },
  pending: {
    title: "Pagamento em análise",
    options: { tone: "info", message: "O Google Play ainda está confirmando o pagamento. O Pro é liberado assim que ele for aprovado." },
  },
} as const;

/** Navegador: grava os aceites e leva para a página de pagamento do Stripe (mesma aba). */
function useWebSubscribeFlow(channel: PaymentChannel): SubscribeFlow {
  const subscribe = useStartSubscription();
  return {
    start: (input, onError) => subscribe.mutate({ ...input, platform: channel.platform }, { onError }),
    isPending: subscribe.isPending,
  };
}

/** App da Play: compra pela própria Play e o servidor confere. Fechar a janela da Play não é erro. */
function usePlaySubscribeFlow(channel: PaymentChannel): SubscribeFlow {
  const { showToast } = useAppShell();
  const subscribe = useStoreSubscription(purchasePlaySubscription);
  return {
    start: (input, onError) =>
      subscribe.mutate(
        { ...input, provider: channel.provider, platform: channel.platform },
        {
          onSuccess: (status) => showToast(PLAY_RESULT_TOASTS[status].title, PLAY_RESULT_TOASTS[status].options),
          onError: (error) => {
            if (error instanceof PlayPurchaseCanceledError) return;
            onError(error as ApiError);
          },
        },
      ),
    isPending: subscribe.isPending,
  };
}

/** Fluxo de assinatura do canal desta sessão. Canal novo = um hook de fluxo + uma entrada aqui. */
export function useSubscribeFlow(channel: PaymentChannel): SubscribeFlow {
  const flows: Record<PaymentChannelId, SubscribeFlow> = {
    web: useWebSubscribeFlow(channel),
    play: usePlaySubscribeFlow(channel),
  };
  return flows[channel.id];
}
