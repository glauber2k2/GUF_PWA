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
      "Sim, aqui no app e sem multa. Cancelando em até 7 dias da contratação, devolvemos o valor inteiro e o Pro termina na hora. Depois disso, o Pro continua até o fim do período já pago e não há nova cobrança.",
  },
  {
    question: "Como é feito o pagamento?",
    answer:
      "Na página segura do Stripe. A assinatura renova automaticamente até você cancelar, e o cartão e os recibos ficam em Assinatura › Pagamento e recibos.",
  },
  {
    question: "O que acontece com meus dados se eu voltar ao Free?",
    answer:
      "Nada se perde. Treinos, recordes e evolução continuam completos em qualquer plano; os gráficos voltam ao período do Free e você mantém os projetos e rotinas que já tem.",
  },
];
