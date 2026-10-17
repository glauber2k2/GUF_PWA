# LGPD Audit Status

**Projeto**: Guf App (PWA de evolução fitness)
**Cenário**: C — Híbrido (Pipeline B até L4, depois Pipeline A a partir de F3 para features novas)
**Início**: 2026-10-16
**Última atualização**: 2026-10-17
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
- [ ] F8 — Retention/erasure
- [x] F9 — Incident response — runbook, modelos e registro (2026-10-17); exercício simulado a agendar
- [ ] F10 — ROPA — ⏸ CHECKPOINT
- [ ] F11 — Encarregado — adiado para antes do lançamento (decisão de 2026-10-17; ver nota)
- [ ] F12 — RIPD (módulo de medidas) — ⏸ CHECKPOINT
- [ ] F13 — ECA Digital
- [ ] F14 — Vendors + DPA + transferência internacional
- [ ] F15 — Relatório final

## Artefatos gerados
- `.lgpd/discovery.md` — v1, 2026-10-16
- `.lgpd/gaps.md` — v1, 2026-10-16
- `.lgpd/data-map.md` — v1, 2026-10-16
- `.lgpd/legal-basis.md` — v1 (proposta), 2026-10-16
- `.lgpd/lia/a012-seguranca.md` — v1, 2026-10-16
- `.lgpd/consent-ledger.md` — v1, 2026-10-17
- `.lgpd/policies/privacy-policy-v1-draft.md` — v1 rascunho, 2026-10-17 (não publicar)

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

## Próximo passo
F8 — `lgpd-retention-erasure`: prazos e eliminação (backups do plano Free, foto no Storage na exclusão — G15, G18), sem custo.
