# Operador: Google Play (pagamentos do Pro no app Android) — PLANEJADO

- Razão social / registro: Google LLC / Google Commerce Limited (conforme o contrato de distribuição da Play) — **confirmar ao abrir a conta de desenvolvedor**
- País(es) de tratamento: EUA (e sub-operadores do Google)
- Finalidade: cobrar a assinatura do Pro comprada no app Android (TWA), renovação, devoluções (A024)
- Dados compartilhados pelo guf: **nenhum** para a compra (o app abre a janela de compra da Play; o Google já conhece a conta Google da pessoa). O servidor do guf consulta a compra pelo token
- Dados que o guf recebe do Google: token da compra, produto (`pro_mensal`/`pro_anual`), situação e datas da assinatura, id e valor do pedido, avisos (RTDN: tipo e id). Nunca forma de pagamento nem dados do cartão
- Dados guardados: `billing_purchase_links` (token → conta, enquanto a conta existir), `subscriptions`, `billing_payments` (5 anos, lei fiscal), `billing_events` (90 dias)
- Sensíveis (Art. 11)? Não
- Papel: **controlador independente** na relação de pagamento com o comprador (a Play é a vendedora de registro); **operador** nas consultas que o guf faz pela API ⚖
- Tier: **Alto** (dinheiro), sem dados do app
- Owner interno: Glauber
- Situação: **não contratado** (falta a conta de desenvolvedor e os produtos). Configuração em [`docs/play-store-twa.md`](../../docs/play-store-twa.md) § 5
- Última revisão: 2026-11-07 | Próxima: ao abrir a conta de desenvolvedor

## 1. Contrato e base legal
- [ ] Contrato de distribuição da Play e termos de pagamentos aceitos/arquivados
- [x] Finalidade compatível com A024 (`legal-basis.md`)
- [x] Base legal: Art. 7º, V (contrato); Art. 7º, II (registros fiscais)

## 2. Segurança
- [ ] Conta de serviço só com "Ver dados financeiros" e "Gerenciar pedidos e assinaturas"; chave JSON só em secrets do Supabase
- [ ] Segredo do push do Pub/Sub (`GOOGLE_PLAY_RTDN_TOKEN`) com 32+ caracteres; cada aviso é relido na API antes de gravar
- [x] Compra conferida no servidor (token lido na Google Play Developer API) e ligada a uma só conta (GB005)
- [x] Compra hospedada pela Play: forma de pagamento nunca passa pelo app

## 3. Transferência internacional
- [ ] Registrar em `.lgpd/transfers/` (EUA; Art. 33, IX c/c Art. 7º, V)

## 4. Documentos
- Termos da Assinatura 1.4 e Política 1.6 (migration `20261107130100_legal_docs_google_play`, não aplicada; vai com a abertura da venda)
