# Operador: Cloudflare

- Razão social / registro: Cloudflare, Inc. (EUA) — **confirmar no DPA**
- País(es) de tratamento: EUA e rede global de borda
- Finalidade: (1) hospedar o site estático do app (`treino.gufapp.com.br`, Worker `guf-pwa`), do painel (`admin.gufapp.com.br`, Worker `guf-admin`) e a página `gufapp.com.br`; (2) DNS do domínio; (3) Email Routing: encaminhar as mensagens enviadas para `contato@` e `suporte@gufapp.com.br` (inclusive pedidos de titular) para a caixa do Gmail
- Dados compartilhados: IP, user-agent, URL acessada e data/hora (logs de acesso da hospedagem); no Email Routing, o remetente, o destinatário e o conteúdo das mensagens em trânsito. **Nenhum dado do banco passa pela Cloudflare**: o app fala direto com o Supabase pelo navegador | Sensíveis (Art. 11)? Não pela hospedagem; uma mensagem ao suporte pode conter o que o titular escrever
- Tier: **Médio** (dados de acesso + mensagens ao suporte em trânsito)
- Plano: Free (Workers com assets estáticos; uso comercial permitido)
- Owner interno: o controlador
- Início: 2026-11-06 (produção; a Vercel saiu em 2026-11-07) | Informado na Política 1.9
- Última revisão: 2026-11-07 | Próxima revisão: 2027-11-07

## 1. Contrato e base legal
- [ ] 🚫 **DPA aceito/arquivado** — a Cloudflare inclui um DPA nos termos de serviço; baixar a cópia e arquivar aqui
- [x] Papel: operador
- [x] Finalidade compatível com A012 (registros de acesso) e com o atendimento ao titular
- [x] Base legal: A012 (`legal-basis.md`); encaminhamento do suporte = execução do contrato e exercício de direitos

## 2. Segurança
- [x] HTTPS (cabeçalhos em `apps/web/public/_headers` e `apps/admin/public/_headers`)
- [ ] MFA na conta (usuário pessoal e Gmail da guf como Super Administrator) — **verificar**
- [ ] Certificações — confirmar no trust center
- [ ] Retenção dos logs de acesso e do Email Routing no plano Free — confirmar (G9)

## 3. Sub-operadores
- [ ] Baixar a lista de sub-operadores

## 4. Transferência internacional
- [ ] 🚫 **Base do Art. 33** — na Política: art. 33, IX + art. 7º, V; conferir as cláusulas do DPA (G8)
- [x] País mapeado: EUA/global

## 5. Direitos do titular e retenção
- [x] Não guarda conteúdo do usuário do app
- [ ] Prazo dos logs de acesso e das mensagens no Email Routing

## 6. Incidentes
- [ ] Prazo de notificação no DPA

## 7. Operacional
- [ ] Cópia do DPA nesta pasta
- [x] Owner definido

## Avaliação — Cloudflare
- Itens atendidos: 7/15
- Eliminatórios (🚫): DPA e base do Art. 33 pendentes
- Veredito: **APROVADO COM RESSALVAS**
- Gaps abertos: G7, G8, G9
