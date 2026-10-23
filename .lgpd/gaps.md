# Gap Analysis e Plano de Remediação — 2026-10-16

> Diagnóstico técnico baseado no código. **Não é parecer jurídico**: os itens marcados com ⚖ precisam de validação de advogado especializado em proteção de dados antes de entrar em produção com usuários reais.

## Resumo
- **5** gaps críticos (G22 incluído no L4)
- **8** gaps altos (G23 incluído no L4)
- **8** gaps médios
- **2** gaps baixos
- **10** pontos já conformes (verde)

## Tabela de diagnóstico

| # | Item | Status | Evidência | Severidade | Esforço | Norma |
|---|---|---|---|---|---|---|
| G1 | Controlador identificado (razão social, CNPJ, contato) | GREEN | **2026-10-23**: controlador = Glauber Monteiro, pessoa física (sem CNPJ nem endereço publicados), contato `devglaubermonteiro@gmail.com`, nos Termos/Política 1.0 e no rodapé do leitor. Ao abrir empresa: nova versão com razão social e CNPJ | crítica | baixo | Art. 9º, III |
| G2 | Encarregado designado e divulgado | GREEN (dispensado) | **2026-10-23**: não designado por decisão do controlador — agente de pequeno porte de baixo risco, dispensa do art. 11 da Res. 2/2022, com canal de comunicação publicado. Gatilhos para designar em `encarregado.md` | crítica | baixo | Art. 41; Res. 2/2022 Art. 11; Res. 18/2024 |
| G3 | Política de privacidade final | YELLOW | **2026-10-23**: Política, Termos e Termos da Assinatura 1.0 oficiais, sem marcadores, escritos a partir do comportamento real do sistema (GUF AI, atendimento, comunicados, aparelho, prazos), com novo aceite de todos. **Sem revisão por advogado** (risco aceito pelo controlador até os primeiros 100 clientes pagantes) ⚖ | crítica | médio | Art. 9º ⚖ |
| G4 | Runbook de incidente + registro de 5 anos | YELLOW | **2026-10-17 (F9)**: runbook, modelos e registro criados. Faltam contatos (e-mail do controlador, advogado) e o primeiro exercício simulado | crítica | baixo | Art. 48; Res. 15/2024 Arts. 5º, 6º, 9º, 10 |
| G5 | ROPA | YELLOW | **2026-10-17 (F10)**: rascunho 0.1 em `ROPA.md`; falta revisão jurídica. Antes: inexistente | alta | médio | Art. 37 |
| G6 | Prova do consentimento após exclusão da conta | YELLOW | **2026-10-17 (F3)**: `consent_proofs` + gatilho antes da exclusão, e-mail em SHA-256, 5 anos com eliminação diária (migration `consent_ledger_hardening`, aplicada e testada). Falta validar prazo e base ⚖ | alta | médio | Art. 8º, § 2º (ônus da prova); Art. 16 ⚖ |
| G7 | Contratos/DPA com operadores (Supabase, Vercel/Cloudflare, Google) | RED | nada arquivado | alta | baixo | Art. 39 |
| G8 | Transferência internacional mapeada | YELLOW | **2026-10-16: banco migrado de `us-west-2` (EUA) para `sa-east-1` (São Paulo)**, projeto `yscoujsisrytytqsxkya`. Ainda restam: Supabase Inc. (EUA) e seus sub-operadores, Vercel e Google nos EUA; política diz "[PAÍS DOS SERVIDORES]" | média | baixo | Arts. 33–36; Res. 19/2024 ⚖ |
| G9 | Registros de acesso por 6 meses (prometido na política) | YELLOW | retenção de logs do Supabase depende do plano; não verificado | alta | médio | Marco Civil (Lei 12.965/2014) art. 15 ⚖ |
| G10 | Canal e processo para pedidos do titular fora do app (prazo 15 dias) | GREEN | **2026-10-17 (F5)**: e-mail provisório no app (Perfil › Privacidade, documentos) + fluxo com prazo em `.lgpd/dsar/workflow.md`; trocar por e-mail dedicado no lançamento. Antes: exportar/excluir/revogar no app OK; demais pedidos só por e-mail placeholder, sem controle de prazo | alta | baixo | Art. 18; Art. 19, II (ATPP: Res. 2/2022 Art. 14) |
| G11 | ECA Digital (acesso provável por adolescentes) | YELLOW | **2026-10-17 (F13)**: avaliação em `eca-digital.md` — não direcionado a menores, acesso provável possível; mantém 18+ com compromisso de produto e procedimento para conta de menor; decisão sobre verificação de idade antes do lançamento ⚖. Antes: público 18+ só por autodeclaração | alta | alto (se aplicável) | Lei 15.211/2025 Art. 9º, § 1º; Res. 30/2025 (tema prioritário) ⚖ |
| G12 | Exportação completa | GREEN | **2026-10-17 (F5)**: migration `export_my_data_complete` aplicada e testada. Antes: `export_my_data()` sem `workout_active_periods` e sem e-mail/identidades | média | baixo | Art. 18, II e V |
| G13 | Integridade do ledger de consentimento | GREEN | **2026-10-17 (F3)**: insert direto removido; só funções do banco, com origem e plataforma validadas. Aplicada e testada em 2026-10-17 | média | médio | Art. 8º, § 2º; Art. 6º, X |
| G14 | Hash do texto aceito confere com o texto exibido | GREEN | **2026-10-17 (F3)**: `legal-hash.ts` + script `legal:hashes` + aviso em dev; rascunhos com hash real. Aplicada em 2026-10-17; cada mudança de texto exige nova versão | média | baixo | Art. 8º, § 2º; Art. 9º |
| G15 | Prazo de eliminação pós-exclusão e backups | YELLOW | **2026-10-17 (F8)**: prazos consolidados em `retention.md`; backups do Free a conferir no painel. Antes: `[PRAZO]` na política; backups do Supabase não mapeados | média | baixo | Arts. 15–16 ⚖ |
| G16 | Segurança da autenticação em produção | YELLOW | **2026-10-17 (F7)**: `config.toml` com senha mínima 8; checklist do painel em `security-checklist.md` (conferência pendente). Antes: `config.toml` local: senha mínima 6 (app exige 8), sem CAPTCHA/MFA; painel de produção não verificado | média | baixo | Art. 46 |
| G17 | RIPD do módulo de medidas (dados de saúde) | GREEN | **2026-10-22**: `RIPD/ripd-medidas-corporais.md` v0.1 junto com a tela; pendências de lançamento na seção 6 do RIPD | média | médio | Art. 38; Res. 2/2022 Art. 4º |
| G18 | Foto enviada (futuro) apagada na exclusão da conta | GREEN | **2026-10-17 (F8)**: `delete-account` apaga `avatars/<user_id>/` antes da exclusão (publicada). Antes: cascata do banco não apaga arquivos do Storage | média | baixo | Art. 16; Art. 18, VI |
| G19 | Log de auditoria de ações sensíveis (exclusão, revogação, exportação) | GREEN | **2026-10-17 (F6)**: `audit_log` encadeado por hash, aplicado e testado (`.lgpd/audit-log.md`). Antes: só `consent_records` | média | médio | Art. 6º, X |
| G20 | CORS `*` na Edge Function `delete-account` | GREEN | **2026-10-23**: `ALLOWED_ORIGINS` = app (`gufapp.vercel.app`), painel (`adminguf.vercel.app`) e localhost; testado nas 4 funções chamadas pelo navegador (fora da lista → 403). **2026-10-17 (F7)**: CORS por lista publicado; falta definir o secret `ALLOWED_ORIGINS` com o domínio do app. Antes: comentário no código pede restringir | baixa | baixo | Art. 46 |
| G21 | Treinamento e governança | RED | inexistente | baixa | médio | Art. 50 |
| G22 | Controlador não constituído | YELLOW | **2026-10-23**: assumido como pessoa natural com fins econômicos (ATPP, Res. 2/2022), identificada nos documentos 1.0. Abrir empresa junto com os primeiros clientes pagantes (cobrança exige emissão fiscal) ⚖ | crítica | médio | Art. 5º, VI; Art. 9º, III ⚖ |
| G23 | Infra de desenvolvimento usada com dados reais | YELLOW | Supabase **Free** (logs curtos, backups limitados), **SMTP padrão** (só para testes), Vercel **Hobby** (uso não comercial) | alta | baixo | Art. 46 |
| G24 | Painel da equipe: medidas antes de abrir a colaboradores (termo de confidencialidade, Política nova, LIA de produto) | YELLOW | **2026-10-22**: painel com papéis, segundo fator obrigatório, e-mail mascarado e auditoria de leitura e alteração; falta o termo de confidencialidade (Art. 47) de cada colaborador, a Política com a seção do suporte e dos comunicados, a LIA de comunicado de produto (`lia/a023-comunicados.md`, rascunho) e a opção de não receber comunicados de produto no app. **2026-10-23**: opção feita (Configurações › Preferências › "Novidades do guf no app", `profiles.product_announcements_opt_out`, aplicada no banco por `announcement_allowed_for` na lista e no alcance); continuam pendentes o termo de confidencialidade, a Política e a LIA ⚖ | alta | baixo | Arts. 6º, X; 46; 47; 9º; 10 ⚖ |
| G25 | Exportação de dados sem os registros de comunicados vistos | GREEN | **2026-10-23**: `guf-export/7` com comunicados (visto, fechado, botão), suspensões da conta, exclusão agendada e conversões de ficha; testado. **2026-10-22**: `announcement_receipts` (visto/fechado/clique) ainda não entra em `export_my_data` | baixa | baixo | Art. 18, II e V |
| G26 | Exclusão da conta pelo painel barrada pelo projeto Favoritos | GREEN | **2026-10-23**: a cascata de `auth.users` → `projects` era barrada (GP002) quando havia usuário na sessão (painel). Migration `20261023180000_favorites_allow_account_deletion`: o Favoritos sai quando o dono não existe mais; apagar ou arquivar o Favoritos de conta ativa continua proibido. Testado em transação desfeita | crítica | baixo | Art. 18, VI; Art. 16 |

> **Atualização L4 (2026-10-16)**: Supabase confirmado em `us-west-2` (EUA), plano Free, SMTP padrão; hospedagem só na Vercel (Hobby); nenhum DPA aceito ou arquivado. Fichas em `.lgpd/vendors/`.

## Regra prática para o beta
Enquanto o app tiver **só o desenvolvedor e testadores convidados que sabem que é um teste**, com dados fictícios ou sem medidas corporais, o risco é baixo. **Antes de abrir para pessoas de fora** (beta público, divulgação, lojas), resolver G1, G2, G3, G7, G8, G22 e G23.

### Já conforme (GREEN)
- RLS em todas as tabelas, só dados do próprio usuário (Art. 46).
- Sem analytics, pixels, rastreadores ou fontes/CDNs externos (Art. 6º, III — necessidade).
- Cadastro com caixas desmarcadas e botão bloqueado; portão `/aceite` para versões novas (Art. 8º).
- Consentimento de saúde em camadas, específico, com botões de mesmo peso (Art. 11, I).
- Revogar o consentimento de saúde apaga as medidas na mesma operação (Art. 18, IX; Art. 16).
- Exportar dados e excluir conta pelo próprio app (Art. 18, II, V e VI).
- Consentimentos versionados com hash do documento e origem (Art. 8º, § 2º).
- Minimização: sem localização, contatos ou telefone (Art. 6º, III).
- Ao sair, dados locais (IndexedDB, cache) são limpos; service worker não guarda dados do usuário (Art. 46).
- Chave `service_role` só na Edge Function, nunca no front (Art. 46).

## Ações imediatas (próxima semana) — Crítica + baixo esforço
1. **Definir controlador e designar o Encarregado** (G1, G2) — responsável: sócios/AAHBRANT · prazo: 2026-10-23
   - Skill: `lgpd-dpo-encarregado`
2. **Publicar runbook de incidente e criar `.lgpd/incidents/log.md`** (G4) — responsável: técnico · prazo: 2026-10-23
   - Skill: `lgpd-incident-response`
3. **Canal de pedidos do titular** (e-mail dedicado + controle de prazo de 15 dias) (G10) — prazo: 2026-10-23
   - Skill: `lgpd-dsar`
4. **Arquivar os DPAs padrão** de Supabase, Vercel/Cloudflare e Google e confirmar a região do projeto Supabase (G7, G8) — prazo: 2026-10-23
   - Skills: `lgpd-vendor-audit`, `lgpd-dpa`, `lgpd-international-transfer`

## Próximas 2–4 semanas
5. Inventário de dados e ROPA (G5) — `lgpd-data-mapping` + `lgpd-ropa`
6. Base legal por atividade, revisando a tabela da política (G3) — `lgpd-legal-basis`
7. Prova mínima de consentimento após exclusão (G6) — nova migration com tabela separada, sem dados de treino ⚖ — `lgpd-consent-schema` + `lgpd-retention-erasure`
8. Fechar o ledger: remover `insert` direto em `consent_records`, gravar só via RPC (G13) e conferir o hash dos textos (G14) — `lgpd-consent-schema`
9. Completar `export_my_data()` (G12) — nova migration — `lgpd-dsar`
10. Política de privacidade v1 com os dados reais, para revisão jurídica (G3, G9, G15) — `lgpd-privacy-policy` ⏸ CHECKPOINT

## Próximo trimestre
11. Avaliação ECA Digital (G11) — `lgpd-eca-digital-minors` ⚖
12. RIPD do módulo de medidas antes de lançá-lo (G17) — `lgpd-ripd` ⏸ CHECKPOINT
13. Retenção, backups e eliminação de arquivos do Storage (G15, G18) — `lgpd-retention-erasure`
14. Log de auditoria de ações sensíveis (G19) — `lgpd-audit-logging`
15. Endurecer autenticação em produção e CORS (G16, G20) — `lgpd-encryption-keys` / checklist do painel

## Backlog
16. Treinamento anual e programa de governança (G21) — Art. 50
17. Revisão de segurança / pentest antes de monetizar
