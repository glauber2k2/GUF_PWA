# LGPD e consumidor — riscos que sobram, lançamento e venda do Pro

| Feito por | Glauber (com Claude Code) |
| --- | --- |
| Data | 29/10/2026 |
| Fase | Antes do lançamento público; Pro ainda não à venda |
| Controlador | Glauber Monteiro, pessoa física, agente de tratamento de pequeno porte (Res. CD/ANPD nº 2/2022), sem encarregado (art. 11 da mesma resolução), canal `devglaubermonteiro@gmail.com` |

> Documento técnico, **não é parecer jurídico**. Foi feito com o que existe hoje: sem advogado, sem contador e sem orçamento. Ele diz o que o sistema e os documentos já fazem, o que **ainda pode gerar multa ou processo** e o que reduz esse risco sem custo. O resumo geral da LGPD no projeto fica em [`lgpd.md`](lgpd.md) e a auditoria completa em [`.lgpd/`](../.lgpd/STATUS.md).

---

## 1. Resumo em uma página

- **O guf já cumpre o essencial da LGPD para um projeto do tamanho dele:**
  - coleta mínima, sem anúncios nem rastreadores;
  - Termos e Política fiéis ao sistema, com aceite versionado e prova do texto aceito;
  - direitos do titular dentro do app (exportar, excluir, revogar);
  - banco no Brasil, isolamento por conta (RLS), registro de auditoria;
  - plano de incidente e consentimento específico para medidas corporais.
- **Nesta revisão (29/10)**, os Termos 1.3 e a Política 1.4 ganharam:
  - **Observações:** passam a seguir a visibilidade do treino, com novo aceite. As já escritas só aparecem para outros depois que o dono aceita.
  - **"Suas escolhas e responsabilidades":** seção nova nos Termos.
  - **Limitação de responsabilidade:** reescrita como o Código de Defesa do Consumidor permite.
  - **Pontos por treino:** aparecem para quem compete.
  - **Pódio do mês anterior:** aparece nos 3 primeiros dias.
- **Riscos que não consegui zerar** (seção 3), do maior para o menor:
  - ECA Digital (adolescentes);
  - GUF AI no plano gratuito do Google;
  - contratos com os provedores (DPA e cláusulas-padrão);
  - falta de revisão jurídica;
  - observações com dados de saúde;
  - infraestrutura em planos gratuitos.
- **Para vender o Pro**, a lei de comércio eletrônico exige mostrar CPF ou CNPJ e endereço do vendedor (seção 5). Hoje os documentos não mostram, de propósito. Isso precisa ser decidido antes da primeira cobrança.

---

## 2. Até onde a responsabilidade pode ficar com o usuário

Foi pedido que, ao aceitar os Termos, a responsabilidade fique com o usuário. **A lei não permite transferir tudo**, e tentar pode piorar a situação:

- **O que é nulo:** cláusula que "impossibilite, exonere ou atenue" a responsabilidade do fornecedor é nula (Código de Defesa do Consumidor, art. 51, I). Um juiz ignora a cláusula, e ela ainda pode ser usada como sinal de abuso.
- **O que não se transfere:** na LGPD, o controlador responde pelos danos do tratamento (arts. 42 a 44). Um vazamento por falha de segurança do guf, por exemplo, continua sendo responsabilidade do guf, aceite o usuário o que aceitar.

**O que é válido e foi feito nos Termos 1.3:**

| Cláusula | Por que vale |
|---|---|
| "Suas escolhas e responsabilidades": a pessoa decide o que escreve, mostra e para quem; o que outras pessoas fazem fora do app (prints) não é controlado pelo guf; dados declarados (idade, cargas) devem ser verdadeiros; treinar e seguir sugestões são decisões dela; proteger senha e aparelho; fraude na competição | Informa e documenta a escolha consciente da pessoa. É o que permite, num conflito, mostrar que o dano veio da conduta dela |
| Limitação reescrita com o art. 14, § 3º, II, do CDC (culpa exclusiva do consumidor ou de terceiro): lesões no exercício, decisões tomadas com o GUF AI sem conferir, conteúdo de outros usuários, uso fora do app do que a pessoa mostrou | Usa a exceção que o próprio CDC prevê, em vez de uma isenção genérica (que seria nula) |
| "Conteúdo do usuário": a pessoa responde pelo que escreve em nome, foto, bio, observações e perguntas, e é orientada a não colocar dados de saúde, documentos ou dados de terceiros | Reduz a chance de dado sensível ou de terceiro circular no app e mostra que o guf orientou |
| Aceite com caixa desmarcada, versão, hash do texto e "O que mudou" antes de cada versão nova | Prova de que a pessoa foi informada (LGPD, art. 8º, § 2º: o ônus da prova é do controlador) |

**Na prática:** o que reduz processo é a pessoa ter sido avisada de forma clara, antes, e ter escolhido. Isso já acontece. O que **não** reduz é uma frase dizendo que "o usuário assume toda a responsabilidade".

---

## 3. Riscos que ainda podem gerar multa ou processo

Escala: **probabilidade** de alguém reclamar ou a ANPD agir no tamanho atual do guf × **impacto**. Multas da LGPD: art. 52 (advertência, multa simples de até 2% do faturamento limitada a R$ 50 milhões por infração, publicização, bloqueio, eliminação). A Res. CD/ANPD nº 4/2023 diz como calcular quando não há faturamento; não estimei valores. Os riscos de consumidor (Procon e ação judicial) vêm do CDC.

| # | Risco | Norma | Prob. | Impacto | O que já reduz | O que falta e por que não foi feito |
|---|---|---|---|---|---|---|
| R1 | **Adolescentes usando o app.** O app tem perfil social e competição, o que pode ser "de acesso provável" por menores. O ECA Digital proíbe autodeclaração como verificação de idade nesses casos | Lei 15.211/2025, art. 9º, § 1º; multa até 10% ou R$ 10 a R$ 1.000 por usuário, limite R$ 50 mi (art. 35, II) | Média | Alto | Público 18+ nos Termos; caixa "Tenho 18 anos ou mais" desmarcada; sem anúncios, perfilamento, chat ou loot box; procedimento de exclusão de conta de menor (`.lgpd/eca-digital.md`) | Verificação de idade confiável custa dinheiro (serviço de documento ou biometria) e muda o cadastro, que não foi alterado. **Sem divulgar para menores**, escolas ou redes voltadas a adolescentes, e com exclusão rápida de contas de menor, o risco cai bastante, mas não zera |
| R2 | **GUF AI no plano gratuito do Gemini.** No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos dele, com transferência para os EUA | LGPD, arts. 33 a 36 e Res. 19/2024 (transferência); art. 6º, VI (transparência) | Média | Médio | A Política 1.0 já diz isso; as perguntas são anonimizadas (e-mail, CPF, telefone, links, números longos); medidas e observações nunca vão; aviso na tela para não escrever dados pessoais ou de saúde; retenção de 180 dias | Plano pago do Gemini custa dinheiro. Se surgir reclamação, desligar o GUF AI para todos é uma mudança de configuração |
| R3 | **Contratos com os provedores (DPA) e cláusulas-padrão de transferência** com Supabase (empresa nos EUA, banco em São Paulo), Vercel e Google | LGPD, art. 39 (operador) e art. 33; Res. 19/2024 (cláusulas-padrão brasileiras) | Baixa | Médio | Banco em São Paulo; fichas em `.lgpd/vendors/`; a Política informa provedores e países | Aceitar os DPAs padrão é gratuito e depende só de você (seção 4). Cláusulas-padrão brasileiras assinadas por esses provedores não estão ao alcance de um projeto pequeno: o risco é o mesmo de praticamente todo app brasileiro nessas plataformas |
| R4 | **Documentos sem revisão de advogado** | LGPD, art. 9º; CDC, arts. 46 e 54, § 4º (clareza e destaque de cláusulas que limitam direito) | Baixa | Médio | Textos curtos, fiéis ao sistema, sem marcadores, com resumo, "O que mudou" e destaque nas limitações | Exige dinheiro. Plano de 2026-10-23: revisar depois dos primeiros 100 clientes pagantes |
| R5 | **Observações com dados de saúde** ("dor no ombro", "lesão no joelho"), que agora aparecem para quem vê os treinos. Dado de saúde é sensível | LGPD, art. 11 | Baixa | Médio | É a pessoa que escreve e escolhe quem vê; as já escritas só aparecem depois do aceite dos Termos 1.3; Termos pedem para não escrever dados de saúde; ocultar o histórico esconde tudo; fora do GUF AI e do painel | Filtrar texto livre mudaria a funcionalidade. Se a ANPD entender que treino ou observação é dado de saúde, o cadastro precisaria de consentimento específico (decisão jurídica, `.lgpd/legal-basis.md`) |
| R6 | **Infraestrutura gratuita**: Supabase Free (backups e logs curtos), Vercel Hobby (uso não comercial), e-mail padrão do Supabase (feito para testes) | LGPD, art. 46 (segurança); contrato da Vercel | Média | Baixo a médio | RLS, HTTPS, segundo fator no painel, chaves fora do front, cabeçalhos de segurança | Os planos pagos custam dinheiro. **Atenção:** o e-mail padrão do Supabase tem limite baixo de envio e pode travar a confirmação de cadastro no lançamento (seção 4). Vender o Pro hospedado no Vercel Hobby desrespeita o contrato da Vercel (Cloudflare Pages é gratuito e permite uso comercial) |
| R7 | **Pedidos do titular e incidentes sem resposta no prazo** | LGPD, art. 18 e art. 19, II (15 dias; 30 dias para pequeno porte, Res. 2/2022 art. 14); art. 48 e Res. 15/2024 (incidente: 3 dias úteis, 6 para pequeno porte) | Baixa | Alto | Canal publicado, fluxo em `.lgpd/dsar/workflow.md`, runbook e modelos em `.lgpd/incidents/` | Depende de rotina: ler o e-mail do canal toda semana e seguir o runbook. Não há como automatizar sem custo |
| R8 | **Aceite da versão nova aplicado antes do texto novo estar no ar** | LGPD, art. 8º, § 2º, e art. 9º | Baixa | Médio | As migrations de documentos avisam no cabeçalho e o `CLAUDE.md` registra a ordem | Erro humano possível; a ordem certa está na seção 4 |

---

## 4. Antes do lançamento — tudo gratuito

Na ordem:

1. **Publicar o app com os Termos 1.3 e a Política 1.4** (merge da branch `feat/observacoes-visiveis-no-treino` e deploy). **Só depois** aplicar a migration `20261029150100_legal_docs_workout_notes` (`npx supabase db push --linked`). Todos passarão pelo `/aceite` com "O que mudou".
2. **Segundo fator (MFA)** em Supabase, Vercel, GitHub e na conta Google do canal. É a proteção mais barata contra o pior incidente: alguém entrar como você.
3. **Aceitar os DPAs padrão** de Supabase, Vercel e Google (cada um tem o seu "Data Processing Addendum" nos documentos legais da conta ou do site; os links estão nas fichas de `.lgpd/vendors/`) e guardar o PDF ou o print em `.lgpd/vendors/` (R3).
4. **E-mail de cadastro:** configurar um SMTP gratuito (ex.: Brevo, Resend ou o Gmail do canal com senha de app) no Supabase › Auth › SMTP, para a confirmação de cadastro não travar no limite do e-mail padrão (R6).
5. **Supabase › Auth:** confirmação de e-mail ligada, senha mínima 8 (o app já exige 8).
6. **Ler o e-mail do canal toda semana** e anotar cada pedido em `.lgpd/dsar/` (data de chegada e de resposta). O prazo começa quando o pedido chega (R7).
7. **Exercício de incidente de 1 hora:** ler `.lgpd/incidents/runbook.md` e simular "vazou o banco": quem avisa, o que avisa, em quantos dias (R7).
8. **Divulgação:** não divulgar para menores, escolas ou perfis voltados a adolescentes. Se aparecer conta de menor, excluir pelo painel com o motivo "violação dos Termos" (R1).
9. **Hospedagem:** se for vender o Pro logo, mudar para Cloudflare Pages, que é gratuito e permite uso comercial (o `CLAUDE.md` já prevê). Antes da venda, o Vercel Hobby continua aceitável (R6).

---

## 5. Antes de vender o Pro

Os Termos da Assinatura 1.0 e a Política já descrevem a assinatura:
- preço e renovação informados antes da cobrança;
- cancelamento a qualquer momento, sem multa;
- arrependimento em 7 dias com devolução (CDC, art. 49);
- dados do cartão só com o prestador de pagamento;
- aviso antes de mudança de preço.

O app recusa qualquer cobrança hoje (`billing_unavailable`, antes de gravar qualquer aceite). Para começar a vender:

| Passo | Por quê | Norma |
|---|---|---|
| 1. **Identificar o vendedor** nos Termos da Assinatura e na tela de assinatura: nome, CPF (ou CNPJ, se abrir um MEI) e um endereço físico e eletrônico | Obrigatório para quem vende pela internet. Hoje os documentos não mostram CPF nem endereço, por privacidade | Decreto 7.962/2013, art. 2º, I e II |
| 2. Escolher o **prestador de pagamento** (ex.: Mercado Pago, Stripe, Asaas) e aceitar o DPA dele | A Política e os Termos da Assinatura precisam dizer quem é | LGPD, arts. 9º, V, e 39 |
| 3. Nova versão dos **Termos da Assinatura** (preço, periodicidade, prestador, canal de cancelamento) e da **Política** (prestador, país, dados enviados) | Os textos atuais dizem que isso virá numa versão nova, aceita antes de qualquer cobrança | CDC, arts. 6º, III, e 31; LGPD, art. 9º |
| 4. **Cancelamento tão fácil quanto a contratação**, pelo app | Exigido no comércio eletrônico | Decreto 7.962/2013, art. 5º |
| 5. **Imposto sobre a receita**: como pessoa física, os recebimentos entram no carnê-leão e na declaração anual; um MEI simplifica e permite usar CNPJ em vez do CPF no passo 1 | Obrigação fiscal; não é LGPD. Confirmar com a Receita ou um contador quando houver receita | Legislação do imposto de renda |
| 6. Gateway, Edge Functions de checkout e webhook, marcadores dos textos | Passo a passo técnico em [`plans-and-access.md`](plans-and-access.md) | — |

**Sugestão para não expor seu CPF e endereço:** abrir um **MEI** antes da primeira venda. Ele tem custo mensal baixo, mas não é zero; por isso fica como decisão sua. Com o MEI, o controlador vira a empresa: nova versão de Termos e Política com razão social e CNPJ, como já previsto em `.lgpd/gaps.md` (G22).

---

## 6. Se algo acontecer

| Situação | O que fazer | Prazo |
|---|---|---|
| Alguém pede seus dados, correção ou exclusão por e-mail | Responder pelo fluxo de `.lgpd/dsar/workflow.md`; a maioria se resolve mostrando o caminho no app | 15 dias (até 30 no pequeno porte) |
| Suspeita de vazamento ou acesso indevido | Seguir `.lgpd/incidents/runbook.md`; registrar em `.lgpd/incidents/log.md` mesmo que não precise avisar ninguém | Avaliar já; avisar a ANPD e as pessoas em 3 dias úteis (6 no pequeno porte) se houver risco relevante |
| Reclamação na ANPD ou no Procon | Responder com os registros: aceite com versão e hash (`consent_records`), auditoria (`audit_log`), documentos versionados e este arquivo | No prazo da notificação |
| Conta de menor identificada | Excluir pelo painel (motivo: violação dos Termos) | Assim que souber |

A Res. CD/ANPD nº 4/2023 conta como atenuante ter política de governança, corrigir por conta própria e colaborar. Manter `.lgpd/` atualizado é a forma gratuita de mostrar isso.
