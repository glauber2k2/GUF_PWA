# Operador: Stripe (pagamentos do Pro) — PLANEJADO

- Razão social / registro: a definir pela conta aberta (Stripe Brasil ou Stripe Payments Company) — **confirmar no contrato ao abrir a conta**
- País(es) de tratamento: EUA e Irlanda (e sub-operadores do Stripe)
- Finalidade: cobrar a assinatura do Pro, recibos, cancelamento pelo portal, reembolsos e contestações (A024)
- Dados compartilhados pelo guf: `user_id` (pseudônimo, em metadata) e e-mail da conta (recibo). **Nunca** nome, @, treinos, medidas, observações ou dados de uso
- Dados que o titular dá direto ao Stripe: cartão ou Pix, nome no cartão, endereço de cobrança se pedido. O guf não recebe nem guarda (nem os 4 últimos dígitos)
- Sensíveis (Art. 11)? Não
- Papel: **operador** no processamento do pagamento; **controlador independente** para prevenção a fraude e obrigações legais próprias (como o Stripe descreve na política dele) ⚖
- Tier: **Alto** (dinheiro e identificação do comprador), mas sem dados do app
- Owner interno: Glauber
- Situação: **não contratado**. Plano em [`docs/stripe-payments-plan.md`](../../docs/stripe-payments-plan.md)
- Última revisão: 2026-10-30 | Próxima: ao abrir a conta

## 1. Contrato e base legal
- [ ] 🚫 **DPA do Stripe aceito/arquivado** (G33)
- [x] Finalidade compatível com A024 (`legal-basis.md`)
- [x] Base legal: Art. 7º, V (contrato); Art. 7º, II (registros fiscais)

## 2. Segurança
- [ ] MFA na conta do Stripe (reembolso e cancelamento manuais são feitos na tela do Stripe)
- [ ] Alertas por e-mail de reembolso e contestação ligados
- [ ] Chave **restrita** (Checkout, Customers, Subscriptions, Refunds, Billing Portal), só em secrets do Supabase
- [ ] Assinatura do webhook conferida; idempotência por `event_id`
- [x] Checkout e portal hospedados pelo Stripe: cartão nunca passa pelo app (PCI no escopo do Stripe)

## 3. Sub-operadores
- [ ] Baixar a lista de sub-operadores do Stripe

## 4. Transferência internacional
- [ ] 🚫 **Base do Art. 33**: DPA com cláusulas-padrão do próprio Stripe; cláusulas-padrão brasileiras (Res. CD/ANPD nº 19/2024) não assinadas — mesmo risco R3 de `docs/lgpd-riscos-e-lancamento.md`
- [x] Países mapeados: EUA, Irlanda

## 5. Retenção
- No guf: pagamentos sem identificação por 5 anos; pedidos de reembolso 5 anos (mensagem livre 90 dias); eventos do webhook 90 dias, sem o corpo (`.lgpd/retention.md`)
- No Stripe: pelo prazo de retenção do provedor
