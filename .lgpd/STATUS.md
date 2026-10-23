# LGPD Audit Status

**Projeto**: Guf App (PWA de evolução fitness)
**Cenário**: C — Híbrido (Pipeline B até L4, depois Pipeline A a partir de F3 para features novas)
**Início**: 2026-10-16
**Última atualização**: 2026-10-23
**Encarregado**: pendente designação
**Controlador**: não constituído (beta desenvolvido por Glauber, pessoa natural) — G22

## Pipeline atual
- [x] L0 — Setup `.lgpd/`
- [x] L1 — Legacy retrofit (gap analysis) — aprovado em 2026-10-16
- [x] L2 — Data mapping (`lgpd-data-mapping`)
- [x] L3 — Legal basis (`lgpd-legal-basis`)
- [x] L4 — Vendor audit (`lgpd-vendor-audit`)
- [x] F3 — Consent schema (prova pós-exclusão, ledger fechado) — aplicada e testada em 2026-10-17
- [~] F4 — Privacy policy v1 — ⏸ CHECKPOINT: rascunho pronto (2026-10-17), aguardando revisão jurídica
- [x] F5 — DSAR (canal + exportação completa) — aplicada e testada em 2026-10-17
- [x] F6 — Audit logging — aplicada e testada em 2026-10-17
- [x] F7 — Encryption/keys — itens sem custo feitos (2026-10-17); conferências nos painéis com o desenvolvedor
- [x] F8 — Retention/erasure — tabela de prazos e limpeza da foto na exclusão (2026-10-17); backups a conferir no painel
- [x] F9 — Incident response — runbook, modelos e registro (2026-10-17); exercício simulado a agendar
- [~] F10 — ROPA — ⏸ CHECKPOINT: rascunho 0.1 (2026-10-17); revisão jurídica no futuro
- [ ] F11 — Encarregado — adiado para antes do lançamento (decisão de 2026-10-17; ver nota)
- [~] F12 — RIPD: módulo social (`RIPD/ripd-social.md`, rascunho 2026-10-18, ⏸ CHECKPOINT aguardando aprovação); módulo de medidas (`RIPD/ripd-medidas-corporais.md` v0.1, 2026-10-22, ⏸ CHECKPOINT aguardando aprovação)
- [~] F13 — ECA Digital — avaliação em rascunho (2026-10-17); decisão sobre verificação de idade antes do lançamento ⚖
- [ ] F14 — Vendors + DPA + transferência internacional — futuro (controlador formal); verificar DPAs gratuitos
- [x] F15 — Relatório final — `.lgpd/REPORT.md` (2026-10-17)

## Artefatos gerados
- `.lgpd/discovery.md` — v1, 2026-10-16
- `.lgpd/gaps.md` — v1, 2026-10-16
- `.lgpd/data-map.md` — v1, 2026-10-16
- `.lgpd/legal-basis.md` — v1 (proposta), 2026-10-16
- `.lgpd/lia/a012-seguranca.md` — v1, 2026-10-16
- `.lgpd/consent-ledger.md` — v1, 2026-10-17
- `.lgpd/policies/privacy-policy-v1-draft.md` — v1 rascunho, 2026-10-17 (não publicar)
- `.lgpd/RIPD/ripd-social.md` + `RIPD/INDEX.md` — v0.1 rascunho, 2026-10-18 (A017–A019); v0.4 em 2026-10-19 (A020, notificações no celular)
- `.lgpd/vendors/push-services.md` — v1, 2026-10-19 (serviços de push do navegador)

## L1 — Legacy retrofit ✓
- Discovery completo (código; painel e contratos não verificados)
- 21 gaps identificados (4 críticos, 7 altos, 8 médios, 2 baixos)
- Plano em `.lgpd/gaps.md`

## L2 — Data mapping ✓
- 15 atividades inventariadas (A001–A015)
- 1 envolve dado sensível (A010 medidas; A013/A014 quando houver medidas)
- 0 direcionadas a menores; todas com acesso "possível" até a avaliação ECA Digital (G11)
- 1 a avaliar como alto risco → RIPD recomendado: `ripd-medidas-corporais` (A010)
- 3 novos achados (N1–N3) no fim do `data-map.md`

## L3 — Legal basis ✓
- 15 atividades com base legal proposta
- 1 usa consentimento (A010, Art. 11, I)
- 1 usa legítimo interesse (A012-b; LIA em rascunho, decisão pendente)
- 10 usam execução de contrato (Art. 7º, V)
- 4 decisões pendentes para o jurídico (fim do `legal-basis.md`)

## L4 — Vendor audit ✓
- 2 operadores (Supabase — crítico; Vercel — baixo/médio) + Google como terceiro controlador
- 0 com DPA + base de transferência adequada (eliminatórios pendentes nos dois operadores)
- Supabase confirmado em `us-west-2` (EUA), plano Free, SMTP padrão
- Novos gaps: G22 (controlador não constituído), G23 (infra de desenvolvimento)
- Fichas em `.lgpd/vendors/`

## Migração do banco para o Brasil ✓ (2026-10-16)
- Projeto novo `GUF DEV` (`yscoujsisrytytqsxkya`, `sa-east-1`): 15 migrations aplicadas, dados importados (contagens iguais em todas as 14 tabelas + `auth.users`/`auth.identities`), job pg_cron ativo, Edge Function `delete-account` publicada, tipos idênticos
- Não copiados por minimização: sessões, refresh tokens e log de auditoria de login (IPs)
- Arquivo exportado apagado da pasta temporária após a importação
- 2026-10-17: login (Auth no painel e Google Cloud) ajustado para o projeto novo, segundo o desenvolvedor
- Pendente: confirmar variáveis da Vercel, testar o deploy, pausar e depois excluir o projeto antigo (`us-west-2`)

## F3 — Consent schema ✓ (2026-10-17)
- Migration `20261017132154_consent_ledger_hardening.sql` (branch `feat/lgpd-consent-ledger`)
- G13: política de insert direto removida; gravação só por `accept_documents`, `grant_health_consent`, `revoke_health_consent` (SECURITY DEFINER, origem e plataforma validadas) e `handle_new_user`
- G6: tabela `consent_proofs` (sem acesso pelo app) preenchida pelo gatilho `before delete on auth.users`; e-mail só em SHA-256; 5 anos (⚖); job diário `purge-expired-consent-proofs`
- G14: `legalContentHashes` em `packages/core/src/legal-hash.ts`, script `pnpm --filter @guf/core legal:hashes`, aviso em `/documentos` só em dev; rascunhos 0.1-dev com hash real
- Propagação a operadores: não se aplica (nenhum operador recebe dados por consentimento)
- Detalhes em `.lgpd/consent-ledger.md`
- Aplicada no projeto `yscoujsisrytytqsxkya` em 2026-10-17 e testada com usuário fictício (transação desfeita): aceite no cadastro, insert direto bloqueado (42501), origem/plataforma inválidas recusadas (22023), consent_proofs inacessível pelo app, exclusão gerou 6 provas de 6 registros com hash do e-mail e prazo de 5 anos, job ativo, nenhum placeholder restante

## Gaps abertos
Ver `.lgpd/gaps.md`.

## F4 — Privacy policy ⏸ CHECKPOINT (2026-10-17)
- Rascunho v1 em `.lgpd/policies/privacy-policy-v1-draft.md` (branch `feat/lgpd-privacy-policy`)
- 15 seções; 7 elementos do Art. 9º: 5 completos, 2 dependem de marcadores (controlador G1/G22, encarregado G2)
- Novo em relação ao texto do app: prova pós-exclusão com hash do e-mail, decisão automatizada (finalização automática, Art. 20), armazenamento no aparelho, responsabilidades, operadores nomeados, banco no Brasil, 9 direitos do Art. 18
- Promessa de "6 meses" dos registros de acesso retirada até a decisão jurídica (G9)
- 8 marcadores e 6 decisões jurídicas listados no fim do rascunho
- **Aguardando revisão jurídica.** Só depois: mover para `privacy-policy-v1.md`, levar a `legal-content.ts`, nova versão em `legal_documents` com hash
- `legal-content.ts` NÃO foi alterado

## F9 — Incident response ✓ (2026-10-17)
- Runbook em `.lgpd/incidents/runbook.md` (cartão de bolso, severidade S1–S4, teste do Art. 5º aplicado ao guf, contenção por componente: Supabase, Vercel, Google, GitHub, app)
- Modelos em `.lgpd/incidents/templates/` (ANPD: 12 itens; titular: 7 itens)
- Registro iniciado em `.lgpd/incidents/log.md` — nenhum incidente até 2026-10-17; guarda de 5 anos
- Pendentes: e-mail de contato do controlador, advogado de referência, MFA dos painéis, primeiro exercício simulado (sugestão: antes de abrir o beta para pessoas de fora)

## Nota — Encarregado adiado (2026-10-17)
- Decisão do desenvolvedor: designar o Encarregado só antes do lançamento; hoje é beta gratuito com testadores convidados
- Fundamento provisório ⚖: Res. CD/ANPD nº 2/2022 (ATPP), Art. 11 — dispensa a indicação do encarregado, mas **exige canal de comunicação com o titular**. A dispensa não vale para tratamento de alto risco (ex.: dados sensíveis em escala); reavaliar ao lançar o módulo de medidas
- Condições para manter o adiamento: (1) beta só com convidados cientes do teste; (2) um e-mail de contato funcionando para pedidos de titulares (G10); (3) designar antes do lançamento ou da abertura para pessoas de fora

## F5 — DSAR ✓ (2026-10-17)
- Migration `20261017141954_export_my_data_complete.sql` (branch `feat/lgpd-dsar`): `export_my_data()` agora inclui conta (e-mail, datas, provedores, dados do cadastro), contas vinculadas, períodos ativos e consentimentos com documento/versão/hash; formato `guf-export/2`; sem senha, tokens nem sessões
- Testada com usuário fictício (transação desfeita): sem login recusado (28000), só dados do próprio usuário, 2 identidades, 1 período ativo, nada de senha/token
- Canal: `PRIVACY_CONTACT_EMAIL` = devglaubermonteiro@gmail.com (provisório do beta) em Perfil › Privacidade › "Outros pedidos sobre seus dados" (mailto com assunto), rodapé do leitor e `/documentos`
- Fluxo, verificação de identidade, modelos de resposta e controle de prazo (15 dias, lembretes no 10º e 13º dia) em `.lgpd/dsar/workflow.md`; controle com dados pessoais fica FORA do repositório
- Pendente: e-mail dedicado e Encarregado antes do lançamento; texto dos documentos com o e-mail na publicação da política v1

## Decisão — sem orçamento (2026-10-17)
- O app segue em beta gratuito, sem empresa aberta e sem orçamento. A auditoria continua **só com o que é gratuito e não exige pessoa jurídica**
- **Agora (custo zero):** F6 auditoria, F7 checklist de segurança/MFA, F8 retenção e eliminação, F10 ROPA (rascunho), F13 análise ECA Digital (rascunho), F15 relatório; aceitar DPAs que os fornecedores oferecem sem custo, se o controlador pessoa natural puder aceitar (F14, conferir)
- **Futuro (exige dinheiro ou empresa):** revisão jurídica (F4, F10, F12, F13), empresa e CNPJ (G1/G22), Encarregado formal (F11), e-mail em domínio próprio, plano pago do Supabase com backups e logs longos (G23), hospedagem de produção, RIPD do módulo de medidas (F12, quando o módulo existir)
- Enquanto isso, o beta fica restrito a convidados cientes de que é um teste (regra prática do `gaps.md`)

## F6 — Audit logging ✓ (2026-10-17)
- Migration `20261017143503_audit_log.sql` (branch `feat/lgpd-audit-log`): tabela `audit_log` só inclusão, encadeada por hash, sem acesso pelo app
- Eventos por gatilho: aceites e revogações, medidas apagadas, exportação, exclusão de conta, eliminações por prazo
- `verify_audit_log()` confere a cadeia; retenção de 5 anos com job mensal `purge-expired-audit-log`
- Testes (usuário fictício, desfeito): 8 eventos na ordem certa, cadeia íntegra, edição/remoção bloqueadas, adulteração detectada, sem e-mail no registro
- Nova atividade A016 no mapa de dados e nas bases legais; detalhes em `.lgpd/audit-log.md`
- Custo: zero

## F7 — Encryption/keys ✓ (2026-10-17, só sem custo)
- Edge Function `delete-account` com CORS por lista (`ALLOWED_ORIGINS`), publicada; ativa quando o secret for definido (G20)
- Cabeçalhos de segurança em `vercel.json` (raiz e `apps/web`; manter só o do Root Directory da Vercel)
- Senha mínima 8 no `config.toml` local; no painel, conferir (G16)
- Decisão: sem criptografia campo a campo nas medidas por enquanto (site estático, sem servidor); reavaliar no RIPD (F12)
- Checklist dos painéis (MFA, Auth, chaves, Security Advisor) em `.lgpd/security-checklist.md`

## F8 — Retention/erasure ✓ (2026-10-17, sem custo)
- Tabela de prazos e passo a passo da exclusão em `.lgpd/retention.md`
- Conferido no banco: todas as tabelas com `user_id` (e as `auth.*`) apagam em cascata com a conta; nenhum bucket no Storage ainda
- G18: Edge Function `delete-account` apaga a pasta `avatars/<user_id>/` antes de excluir a conta (publicada; aborta se a remoção falhar)
- G15: backups do plano Free a conferir no painel (seção 4 do `retention.md`)
- Decisão: sem exclusão por inatividade no beta

## F10 — ROPA ⏸ (2026-10-17)
- Rascunho 0.1 em `.lgpd/ROPA.md` (modelo simplificado da ANPD + campos extras)
- 16 operações como controlador, 0 como operador; 1 com dado sensível (A010), 1 com legítimo interesse (A012)
- Atualizei no `data-map.md` as fichas A013/A014 com o que mudou nas F3–F8
- Revisão jurídica adiada (sem orçamento); revisão semestral: 2027-04-17

## F13 — ECA Digital ⏸ (2026-10-17)
- Rascunho em `.lgpd/eca-digital.md`: não direcionado a menores; acesso provável possível quando aberto ao público
- Sem publicidade, perfilamento, loot boxes, chat, geolocalização: riscos baixos nesses temas
- Principal lacuna: só autodeclaração 18+; decidir com advogado antes do lançamento
- Compromisso de produto registrado no `CLAUDE.md`; procedimento para conta de menor identificada

## F15 — Relatório final ✓ (2026-10-17)
- `.lgpd/REPORT.md`: 6 lacunas resolvidas, 11 encaminhadas, 6 abertas (todas dependem de empresa, advogado ou dinheiro)
- 10 ações gratuitas para o desenvolvedor e lista do que fica para o futuro

## Textos do app e documentação (2026-10-17)
- Política de Privacidade **0.2-dev** no app (`legal-content.ts`) e no banco (migration `20261017150314_privacy_policy_0_2_dev.sql`, `requires_reaccept`): banco no Brasil, Supabase/Vercel/Google, e-mail do canal, eliminação na hora, prova dos aceites por 5 anos, linha de comprovação de aceites; promessa de "6 meses" dos registros de acesso trocada por marcador
- Testadores passam pelo `/aceite` com "O que mudou"; Termos, idade e saúde seguem em 0.1-dev (dependem dos dados da empresa)
- Continua rascunho (sem revisão jurídica); a versão completa para o advogado segue em `policies/privacy-policy-v1-draft.md`
- Resumo para o time: `docs/lgpd.md` (implementado × falta × motivo)

## Próximo passo
Parte gratuita concluída. Pendente com o desenvolvedor: ações da seção 4 do `REPORT.md`. Próxima rodada: quando houver orçamento/empresa (F4 final, F11, F12, F14) ou na revisão semestral (2027-04-17).

## Rodada 2026-10-21 — Planos Free/Pro (A015)
- Planos e direitos de acesso implementados (migrations `plans_and_entitlements` e `legal_docs_plans`); pagamento ainda não existe.
- Base legal: Art. 7º, V (contrato); fiscal Art. 7º, II quando houver cobrança ⚖. Sem dado sensível; sem RIPD (não é alto risco: Res. 2/2022 Art. 4º).
- Aceites agrupados por momento: Termos 0.4-dev + Política 0.6-dev uma vez no `/aceite` (já descrevendo a assinatura futura); Termos da Assinatura 0.1-dev só na tela de assinatura, com as pendências numa única confirmação. `requires_reaccept = false` passa a evitar novo aceite em versões sem mudança material.
- Atualizados: `data-map.md`, `legal-basis.md`, `ROPA.md` (0.2), `retention.md`. Exportação `guf-export/6` inclui plano, direitos e assinaturas.
- Antes de cobrar: escolher e avaliar o prestador de pagamento (`vendors/`, transferência internacional), preencher os marcadores dos Termos da Assinatura e da Política e definir com o contador a retenção fiscal ⚖.
- Regra revista (`charts_window_and_member_month`): o histórico do titular é completo em qualquer plano; o plano limita só o período dos gráficos. O histórico de treinos de OUTRA pessoa passa a mostrar só o mês atual (menos exposição dos dados do titular a seguidores; Art. 6º, III, necessidade). Termos 0.5-dev e Termos da Assinatura 0.2-dev informam a mudança, publicados com `requires_reaccept = false` (não reduzem direitos).

## Rodada 2026-10-22 — Medidas corporais (A010, F12)
- Tela do módulo implementada: Perfil › "Medidas corporais" (só no próprio perfil, selo "Só você"); lista por músculo, evolução e nova medição. Migration `20261022140000_body_measurements_module` (uma medição por dia; RPC `save_body_measurement`, SECURITY INVOKER, consentimento vigente obrigatório — GM001) aplicada e testada em transação desfeita: sem consentimento bloqueia, outra conta lê 0 linhas, revogar apaga e audita.
- Consentimento em camadas pedido só ao entrar no módulo (Art. 11, I; Art. 8º, § 4º): resumo de 5 itens, termo completo, caixa desmarcada, botões de mesmo peso. Configurações › Privacidade avisa onde fica o módulo.
- Minimização: só circunferências; peso e % de gordura não são coletados; sem cópia offline; GUF AI sem acesso.
- Textos: **Termo de Saúde 0.2-dev** (o que é coletado, "Quem vê suas medidas", sem GUF AI, sem cópia no aparelho; novo consentimento) e **Política 0.7-dev** (dado coletado e quem vê; `requires_reaccept = false`, só reduz). Migration `20261022140100_legal_docs_body_measurements` — ⏸ aplicar junto com o deploy do app.
- RIPD `RIPD/ripd-medidas-corporais.md` v0.1 — ⏸ CHECKPOINT. Atualizados: `data-map.md` (A010, A011), `legal-basis.md`, `ROPA.md`, `gaps.md` (G17 verde), `RIPD/INDEX.md`.
- Corrigir e apagar um registro: menu de três pontinhos (Editar · Excluir, com confirmação e "Desfazer").
- Pendências (RIPD, seção 6): revisão jurídica, verificação de idade e Encarregado antes do lançamento público, remover colunas sem uso.

## Rodada 2026-10-22 — Painel da equipe e comunicados no app (A022, A023)
- Implementados `apps/admin` (painel em domínio próprio) e os comunicados no app. Migration `20261022160000_admin_panel` testada em transação desfeita (30 casos: sem segundo fator → GA002; quem não é da equipe → GA001; papel insuficiente → GA003; motivo obrigatório; consentimento de saúde em comunicado de produto → GA009; último login → GA006; cadeia da auditoria íntegra); aplicada em 2026-10-22, com a Edge Function `admin-invite-staff` publicada e o primeiro admin (o desenvolvedor) cadastrado.
- Segurança (Art. 46): nenhuma tabela nova com política para o app; leitura e escrita só por funções `admin_*` que conferem colaborador ativo, segundo fator (aal2) e papel **a cada chamada** (desligar vale na hora); `service_role` só na Edge Function de convite.
- Necessidade (Art. 6º, III): resumo da conta sem medidas, observações, conversas ou cargas; e-mail mascarado (completo só por ação auditada); consentimento de saúde só sim/não e só para Suporte/Admin.
- Responsabilização (Art. 6º, X): `audit_log` com `actor_type = 'staff'`; abrir conta, mostrar e-mail e toda alteração (com motivo) registradas; tela de Auditoria só para Admin.
- Transparência (Art. 6º, VI): mudar @ ou nome manda um aviso dirigido à pessoa no app.
- Atualizados: `data-map.md` (A022, A023), `legal-basis.md`, `ROPA.md`, `retention.md` (comunicados 12 meses; lista de ids até o fim; colaboradores), `incidents/runbook.md` (conta de colaborador comprometida), `RIPD/ripd-medidas-corporais.md` (R9), `gaps.md` (G24, G25). LIA de produto em rascunho: `lia/a023-comunicados.md`.
- ⏸ Antes de abrir o painel a colaboradores além do desenvolvedor (G24): termo de confidencialidade (Art. 47), Política com a seção do suporte e dos comunicados ⚖, LIA aprovada e opção de não receber comunicados de produto.

## Rodada 2026-10-23 — Suspensão e exclusão de contas pelo painel (A022)
- Migration `20261023120000_admin_bans_and_deletion` aplicada em 2026-10-23: suspensão (`account_bans` + `auth.users.banned_until`, sessões encerradas na hora), exclusão imediata e agendada (job a cada 10 min), desvincular todos os logins sociais e ações em lote no painel. Só Admin; toda ação com motivo e auditada; contas da equipe recusadas (GA014).
- Exclusão pelo painel = mesma cascata do app (prova dos aceites e `account_deleted` pelos gatilhos). Conta com arquivos no Storage é recusada (GA015) para não deixar órfãos.
- Transparência (Art. 6º, VI): exclusão agendada manda aviso no app com a data e o caminho para exportar os dados; o login de conta suspensa explica e dá o contato.
- ⚖ Pendente: os Termos de Uso precisam prever suspensão e exclusão por violação (com prazo e contestação) antes de usar esses motivos com pessoas reais; revisar com o jurídico.

## Rodada 2026-10-23 (2) — Redefinir senha pelo painel (A022)
- Migration `20261023160000_admin_password_reset` aplicada e Edge Function `admin-reset-password` publicada em 2026-10-23. Só individual, papel Suporte+, motivo obrigatório e auditado (`staff_sent_password_reset`).
- Minimização e segurança (Art. 6º, III; Art. 46): o e-mail da pessoa é lido só na Edge Function (não vai ao navegador da equipe); a equipe nunca vê nem define a senha; o link vai para o e-mail da própria pessoa e vence (Email OTP Expiration do Supabase Auth; recomendado 15 min).
- **Recusado:** "hard reset" (admin define a senha ou recebe um link para entregar). Daria à equipe acesso à conta, inclusive a dados de saúde (Art. 11), contra o A022. Quem perdeu o e-mail: DSAR com conferência de identidade (`.lgpd/dsar/workflow.md`).

## Rodada 2026-10-23 (3) — Revisão do painel (lgpd-audit)
- Conferido contra o A022: nenhuma ação nova expõe medidas, observações, conversas ou cargas; o e-mail continua mascarado (completo só por ação auditada; na senha nova ele nem chega ao navegador); toda ação tem motivo e auditoria; ações em lote limitadas a 100 contas por vez, uma auditoria por conta.
- ROPA e base legal do A022 atualizados (senha nova, suspensão, exclusão).
- ⚖ Continua pendente: Termos com a suspensão e a exclusão por violação (prazo, aviso e contestação) e a seção do suporte na Política (G24) antes de usar com pessoas reais.

## Rodada 2026-10-23 (4) — Correções aplicadas (lgpd-audit, pendências corrigíveis sem texto jurídico)
- **G26 (novo, crítico, corrigido):** a exclusão de conta pelo painel falhava com GP002 ("O projeto Favoritos não pode ser excluído"): o gatilho `protect_favorites_project` só liberava sem usuário na sessão. Direito de eliminação (Art. 18, VI) restabelecido pela migration `20261023180000_favorites_allow_account_deletion` (aplicada; testada: excluir conta passa, apagar/arquivar o Favoritos de conta ativa continua barrado). A exclusão pelo app e pelo job já funcionavam.
- **G25 → GREEN:** `guf-export/7` (Art. 18, II e V) com comunicados, suspensões, exclusão agendada e conversões de ficha (migration `20261023180100_lgpd_product_opt_out_and_export`, aplicada e testada).
- **G24 (parte técnica):** opção "Novidades do guf no app" em Configurações › Preferências (Art. 10, § 2º; oposição ao tratamento por legítimo interesse, Art. 18, § 2º ⚖). Desligada, a pessoa não recebe comunicados de produto; serviço e legal continuam. O alcance publicado já desconta quem recusou. Continuam pendentes: termo de confidencialidade (Art. 47), Política com o suporte e os comunicados e a LIA aprovada ⚖.
- **G20 → GREEN:** `ALLOWED_ORIGINS` ativo (app, painel, localhost).
- Competição: conferida a pontuação da temporada de outubro; os pontos são recalculados a cada consulta com os parâmetros vigentes (uma linha, a da regra sem esforço) e os estados guardados dos avisos batem com a regra atual. Nada a corrigir.
- ⚖ Fora do alcance técnico (seguem abertos): G1, G2, G3, G7, G21, G22 e a previsão de suspensão/exclusão por violação nos Termos.

## Rodada 2026-10-23 (5) — Checkup depois das últimas entregas (lgpd-audit)
- **Corrigido:** o cronômetro do cardio guardava no aparelho (localStorage) o treino, a série e o horário de início e **não era apagado ao sair da conta** (Art. 46; Art. 6º, III). Agora sai junto com o treino ativo ao sair da conta e também ao finalizar ou descartar o treino. Inventário do A011 atualizado.
- Conferido sem achados: músculos trabalhados e volume ao vivo (dados que a pessoa já vê, calculados no aparelho); excluir rotina (dado da própria pessoa; treinos seguem no histórico); fotos da competição levam ao perfil só de quem já compete com você (nenhuma exposição nova); /redefinir-senha tira os tokens do endereço; painel em duas colunas (só layout).
- **Competição (pontos por dia, valendo desde outubro):** a regra é pública em Competição › Como funciona (montada dos parâmetros do servidor) e no GUF AI; os Termos só remetem às regras publicadas no app, então não houve nova versão ⚖. Recomendação (Art. 6º, VI): avisar quem compete por um comunicado de serviço, porque os pontos de outubro mudaram no meio do mês.
- Seguem abertos os itens jurídicos de antes (G1, G2, G3, G7, G21, G22, Termos com suspensão/exclusão, G24 parte jurídica).
