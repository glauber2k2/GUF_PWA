"use client";

import { useEffect, useRef } from "react";
import type { PaymentChannel } from "@guf/core";
import { useConfirmStorePurchase } from "@/features/plans/api/use-billing";
import { isPlayBillingSupported, listPlayPurchases } from "@/features/plans/helpers/play-billing";

/**
 * No app da Play: confirma no servidor as assinaturas que a loja já tem e o guf ainda não recebeu
 * (o app fechou entre a compra e a confirmação). Sem confirmação, o Google devolve o valor em 3 dias e
 * a pessoa fica sem o Pro. Repetir é seguro (o servidor reconhece a compra já ligada). Silencioso:
 * falhas ficam para a próxima abertura.
 */
export function useReconcileStorePurchases(channel: PaymentChannel) {
  const { mutate: confirm } = useConfirmStorePurchase();
  const hasRun = useRef(false);

  useEffect(() => {
    if (channel.id !== "play" || hasRun.current || !isPlayBillingSupported()) return;
    hasRun.current = true;
    listPlayPurchases()
      .then((purchases) => {
        for (const purchase of purchases) {
          confirm({ provider: channel.provider, purchaseToken: purchase.purchaseToken, productId: purchase.itemId });
        }
      })
      .catch(() => {
        // Loja indisponível agora: tenta de novo na próxima abertura da tela.
      });
  }, [channel, confirm]);
}
