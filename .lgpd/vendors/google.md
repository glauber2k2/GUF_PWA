# Terceiro: Google (login com Google)

- Razão social / registro: Google LLC (EUA) — confirmar
- País: EUA
- Finalidade: provedor de identidade (OAuth) quando o titular escolhe "Entrar com Google"
- Dados: o Google **envia** ao guf nome, e-mail, foto e identificador da conta (escopo padrão). O guf não envia dados de treino ao Google
- Tier: — (não é operador)
- Owner interno: Glauber
- Última revisão: 2026-10-16 | Próxima revisão: anual

## Papel na LGPD
O Google trata os dados da conta Google como **controlador próprio**, sob os termos que o titular aceitou com o Google; ele não trata dados em nome do guf. Por isso **não é operador** e não precisa de DPA do Art. 39 ⚖ (confirmar com o jurídico).

## O que fazer
- [ ] Informar na política de privacidade que o login com Google é opcional e quais dados o guf recebe (o rascunho já cita)
- [ ] Na tela de consentimento OAuth do Google Cloud: preencher nome do app, link da política e dos termos e e-mail de contato, e pedir só os escopos `openid`, `email` e `profile`
- [ ] Ao lançar: a verificação do app OAuth pelo Google pode exigir política publicada em domínio próprio

## Avaliação — Google
- Veredito: **APROVADO** — terceiro controlador; nenhum eliminatório se aplica
