# Terceiro: Google (login com Google)

- Razão social / registro: Google LLC (EUA) — confirmar
- País: EUA
- Finalidade: provedor de identidade (OAuth) quando o titular escolhe "Entrar com Google"
- Dados: o Google **envia** ao guf nome, e-mail, foto e identificador da conta (escopo padrão). O guf não envia dados de treino ao Google
- Tier: — (não é operador)
- Owner interno: o controlador
- Última revisão: 2026-10-16 | Próxima revisão: anual

## Papel na LGPD
O Google trata os dados da conta Google como **controlador próprio**, sob os termos que o titular aceitou com o Google; ele não trata dados em nome do guf. Por isso **não é operador** e não precisa de DPA do Art. 39 ⚖ (confirmar com o jurídico).

## O que fazer
- [ ] Informar na política de privacidade que o login com Google é opcional e quais dados o guf recebe (o rascunho já cita)
- [ ] Na tela de consentimento OAuth do Google Cloud: preencher nome do app, link da política e dos termos e e-mail de contato, e pedir só os escopos `openid`, `email` e `profile`
- [ ] Ao lançar: a verificação do app OAuth pelo Google pode exigir política publicada em domínio próprio

## Avaliação — Google
- Veredito: **APROVADO** — terceiro controlador; nenhum eliminatório se aplica

## Gmail: caixa do suporte (desde 2026-11-07, Política 1.9)
- As mensagens enviadas para `contato@` e `suporte@gufapp.com.br` (inclusive pedidos de titular) chegam pelo Email Routing da Cloudflare a uma conta **Gmail** (conta mãe do guf, conta Google comum, sem Google Workspace).
- Papel: o Google trata essas mensagens como provedor do e-mail, pelos termos de consumidor do Gmail; **não há DPA** (o DPA do Google só existe no Workspace) ⚖. Se o volume de pedidos crescer ou entrar dado sensível com frequência, avaliar migrar a caixa para o Google Workspace (com DPA).
- Retenção: sem exclusão automática; a Política 1.9 informa isso e que o titular pode pedir a exclusão das próprias mensagens.
- Segurança: 2FA forte na conta mãe (ver plano de transferência das contas, Fase 1).
