export interface PlanFaqItem {
  question: string;
  answer: string;
}

/**
 * Dúvidas comuns da tela de planos. As respostas descrevem o que o sistema faz (7 dias no banco,
 * pagamento pelo Stripe, histórico completo em qualquer plano): mudou a regra, muda o texto.
 */
export const PLAN_FAQ: readonly PlanFaqItem[] = [
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, aqui no app e sem multa. Cancelando em até 7 dias do primeiro pagamento, devolvemos o valor inteiro e o Pro termina na hora. Depois disso, o Pro continua até o fim do período já pago e não há nova cobrança.",
  },
  {
    question: "Como é feito o pagamento?",
    answer:
      "No site, na página segura do Stripe; no app Android baixado na Play Store, pelo Google Play, com a forma de pagamento da sua conta Google. A assinatura renova automaticamente até você cancelar. Cartão e recibos ficam em Assinatura › Pagamento e recibos (no Google Play, em Gerenciar no Google Play).",
  },
  {
    question: "Como funciona o plano anual?",
    answer:
      "O valor do ano inteiro é cobrado de uma vez, na assinatura e a cada renovação. O valor por mês que aparece na oferta é só para comparar com o mensal. Desistindo em até 7 dias, o valor anual volta inteiro; depois disso, o Pro continua até o fim do ano pago.",
  },
  {
    question: "O preço atual é promocional?",
    answer:
      "Quando a oferta mostra “Promoção por tempo limitado”, sim: logo abaixo aparece o preço normal que valerá depois. Se você já assina e o preço subir, avisamos antes, e o novo valor só vale a partir da renovação seguinte.",
  },
  {
    question: "Tenho um cupom de desconto. Onde uso?",
    answer:
      "Na página de pagamento do Stripe (assinatura pelo site), no campo do código promocional. Antes de confirmar, ela mostra o valor com desconto, por quantas cobranças ele vale e quanto será cobrado nas renovações. Cupons do Stripe não valem na compra pelo Google Play.",
  },
  {
    question: "O que acontece com meus dados se eu voltar ao Free?",
    answer:
      "Nada se perde. Treinos, recordes e evolução continuam completos em qualquer plano; os gráficos voltam ao período do Free e você mantém os projetos e rotinas que já tem.",
  },
];
