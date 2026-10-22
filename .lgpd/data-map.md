# Mapa de Dados — Guf App

**Versão**: v1 (reverso, a partir do código)
**Data**: 2026-10-16
**Owner global**: Encarregado (pendente designação — G2)

> Bases legais aqui são **propostas** (tiradas do rascunho da política) e serão confirmadas em `.lgpd/legal-basis.md` (L3). Prazos de retenção marcados "proposta" dependem de decisão do controlador e validação jurídica (G15).
> Operadores e regiões: ver `.lgpd/vendors/` (L4). Região do projeto Supabase **ainda não confirmada** (G8).

## Visão geral

| ID | Atividade | Sensível? | Menores? | Alto risco? | Status |
|---|---|---|---|---|---|
| A001 | Cadastro e autenticação por e-mail | Não | Possível (G11) | Não | Em produção (testes) |
| A002 | Login com Google e vinculação de conta | Não | Possível | Não | Em produção (testes) |
| A003 | Registro de aceites e consentimentos | Não* | Possível | Não | Em produção (testes) |
| A004 | Perfil e preferências da conta | Não | Possível | Não | Em produção (testes) |
| A005 | Foto do perfil | Não | Possível | Não | Parcial (upload futuro) |
| A006 | Planejamento de treinos (projetos, rotinas, exercícios próprios) | Não | Possível | Não | Em produção (testes) |
| A007 | Registro de treinos (sessões, séries, pausas, observações) | Não** | Possível | Não | Em produção (testes) |
| A008 | Finalização automática de treino ocioso | Não | Possível | Não | Em produção (testes) |
| A009 | Histórico, evolução e estatísticas | Não** | Possível | Não | Em produção (testes) |
| A010 | Medidas corporais (só o titular vê) | **Sim (saúde)** | Possível | **Avaliado (RIPD ripd-medidas-corporais v0.1)** | Beta (tela em 2026-10-22) |
| A011 | Dados guardados no aparelho (PWA offline) | Não | Possível | Não | Em produção (testes) |
| A012 | Registros de acesso e segurança | Não | Possível | Não | Depende dos operadores |
| A013 | Exportação de dados (direito do titular) | Sim, se houver medidas | Possível | Não | Em produção (testes) |
| A014 | Exclusão de conta | Sim, se houver medidas | Possível | Não | Em produção (testes) |
| A015 | Planos (Free/Pro) e direitos de acesso; pagamento futuro | Não | Possível | Não | Planos implementados (2026-10-21); pagamento futuro |
| A016 | Registro de auditoria | Não | Possível | Não | Em produção (testes) |
| A017 | Perfil social e seguidores | Não | Possível | **Avaliado (RIPD)** | Em produção (testes) |
| A018 | Estatísticas e treinos visíveis a outras pessoas | Não** ⚖ | Possível | **Avaliado (RIPD)** | Em produção (testes) |
| A019 | Competição e pontuação semanal | Não** ⚖ | Possível | **Avaliado (RIPD)** | Em produção (testes) |
| A020 | Avisos no celular (Web Push): competição e seguidores | Não | Possível | **Avaliado (RIPD v0.4)** | Em produção (testado em 2026-10-20) |
| A021 | GUF AI: perguntas sobre os próprios treinos (IA) | Não (medidas e observações ficam de fora) | Possível | **Avaliado (RIPD ripd-guf-ai v0.1)** | Beta (plano gratuito do provedor; só testadores) |

\* O registro do consentimento de saúde revela que o titular usa o módulo de medidas, mas não contém a medida.
\*\* Cargas, repetições e RPE são dados de desempenho esportivo. Tratados como dado comum neste mapa; **validar com o jurídico** se, combinados, podem ser considerados dado referente à saúde (Art. 5º, II) ⚖.

---

### A001 — Cadastro e autenticação por e-mail

| Campo | Valor |
|---|---|
| Slug | a001-cadastro-email |
| Finalidade | Criar a conta, autenticar o usuário e recuperar o acesso |
| Base legal | Proposta: Art. 7º, V — execução de contrato ([detalhes](./legal-basis.md#a001)) |
| Categorias de titulares | Usuários (declarados 18+; adolescentes possíveis — G11) |
| Sensíveis? | Não |
| Dados | e-mail, senha (hash pelo Supabase Auth), nome (opcional), plataforma de cadastro, data de criação, confirmação de e-mail |
| Fonte | Coletado do titular no formulário `/cadastro` |
| Sistemas | `auth.users` (Supabase Auth), `profiles` |
| Operadores | Supabase (Auth + Postgres); serviço de e-mail transacional do Supabase (confirmação/recuperação) |
| Transferência intl. | Provável — confirmar região (G8) |
| Retenção | Enquanto a conta existir; após exclusão, apagado na hora (cascata). Backups: prazo do plano do Supabase (G15) |
| Segurança | TLS, senha com hash, PKCE, RLS, mínimo de 8 caracteres no app (servidor a confirmar — G16) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente (controlador) |

### A002 — Login com Google e vinculação de conta

| Campo | Valor |
|---|---|
| Slug | a002-login-google |
| Finalidade | Permitir entrar com a conta Google e vincular a uma conta de e-mail existente |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não |
| Dados | nome, e-mail, foto (URL), identificador da conta Google, metadados da identidade |
| Fonte | Terceiro (Google), por escolha do titular |
| Sistemas | `auth.users`, `auth.identities`, `profiles.name`, `profiles.avatar_url` |
| Operadores | Google (provedor de identidade), Supabase |
| Transferência intl. | Sim — Google (EUA) |
| Retenção | Enquanto a conta existir |
| Segurança | OAuth com PKCE, `redirectTo` restrito, `?next=` só caminhos internos |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A003 — Registro de aceites e consentimentos

| Campo | Valor |
|---|---|
| Slug | a003-consentimentos |
| Finalidade | Comprovar aceite dos Termos, Política e declaração de idade, e o consentimento específico de saúde (e sua revogação) |
| Base legal | Proposta: Art. 7º, II (comprovação exigida pelo Art. 8º, § 2º) — validar ⚖ |
| Categorias de titulares | Usuários |
| Sensíveis? | Não (indica uso do módulo de medidas) |
| Dados | id do usuário, documento e versão aceitos, ação (granted/revoked), origem, plataforma, data/hora |
| Fonte | Ação do titular (cadastro, `/aceite`, módulo de medidas, Perfil) |
| Sistemas | `consent_records`, `legal_documents`, `consent_proofs` |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Enquanto a conta existir. Após a exclusão: prova mínima em `consent_proofs` (e-mail em SHA-256, sem outros dados) por 5 anos, eliminada por job diário — F3, 2026-10-17; prazo a validar ⚖ |
| Segurança | RLS (só leitura dos próprios); gravação só por funções do banco (G13 resolvido na F3) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A004 — Perfil e preferências da conta

| Campo | Valor |
|---|---|
| Slug | a004-perfil |
| Finalidade | Personalizar o app: nome exibido, unidade de peso, meta semanal, fuso, finalização automática |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não |
| Dados | nome, `weight_unit`, `weekly_goal`, `timezone`, `onboarded_at`, `auto_finish_workout` |
| Fonte | Coletado do titular (Perfil) |
| Sistemas | `profiles` |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Enquanto a conta existir |
| Segurança | RLS (lê e edita só o próprio) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A005 — Foto do perfil

| Campo | Valor |
|---|---|
| Slug | a005-foto-perfil |
| Finalidade | Exibir a foto do usuário no app |
| Base legal | Proposta: Art. 7º, V (foto opcional) |
| Categorias de titulares | Usuários |
| Sensíveis? | Não (imagem não é usada para biometria) |
| Dados | URL da foto do Google; no futuro, arquivo enviado (`avatars/<user_id>/…`) |
| Fonte | Google (A002) ou envio do titular (futuro) |
| Sistemas | `profiles.avatar_url`, metadados da sessão; futuro bucket `avatars` (Supabase Storage) |
| Operadores | Google (hospeda a foto social), Supabase Storage (futuro) |
| Transferência intl. | Sim — Google; Storage a confirmar |
| Retenção | Enquanto a conta existir; **arquivo do Storage não é apagado pela cascata** (G18) |
| Segurança | Volta para a inicial se a foto falhar; políticas do bucket ainda a criar |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A006 — Planejamento de treinos

| Campo | Valor |
|---|---|
| Slug | a006-planejamento |
| Finalidade | Guardar projetos, rotinas, dias da semana, exercícios planejados e exercícios criados pelo usuário |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não (campos de observação em texto livre podem receber qualquer informação) |
| Dados | nomes, descrições, observações, dias, séries/reps/descanso planejados |
| Fonte | Coletado do titular |
| Sistemas | `projects`, `routines`, `routine_exercises`, `exercises` (próprios) |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Enquanto a conta existir; excluir projeto apaga as rotinas |
| Segurança | RLS + verificação de dono dos vínculos |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A007 — Registro de treinos

| Campo | Valor |
|---|---|
| Slug | a007-registro-treinos |
| Finalidade | Registrar treinos feitos: exercícios, séries, carga, repetições, tipo de série, pausas e duração |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não — ver nota \*\* |
| Dados | data local, horários de início/fim e de cada série, períodos ativos, carga, reps, RPE, observações, nome da rotina |
| Fonte | Coletado do titular (inclusive offline, enviado depois) |
| Sistemas | `workout_sessions`, `workout_active_periods`, `session_exercises`, `set_logs`; IndexedDB no aparelho (A011) |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Enquanto a conta existir; usuário pode excluir treinos concluídos |
| Segurança | RLS; ids gerados no aparelho com upsert idempotente |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A008 — Finalização automática de treino ocioso

| Campo | Valor |
|---|---|
| Slug | a008-auto-finalizar |
| Finalidade | Encerrar treinos esquecidos abertos, só para quem ligou a opção |
| Base legal | Proposta: Art. 7º, V (funcionalidade escolhida pelo titular) |
| Categorias de titulares | Usuários que ligaram `auto_finish_workout` |
| Sensíveis? | Não |
| Dados | horários das séries, status do treino |
| Fonte | Inferido pelo servidor (job pg_cron a cada 5 min) |
| Sistemas | `workout_sessions` (`auto_finished`), `workout_active_periods` |
| Operadores | Supabase (pg_cron) |
| Transferência intl. | Provável (G8) |
| Retenção | Igual a A007 |
| Segurança | Função sem acesso pelo app; opção desligada por padrão |
| Alto risco? | Não — decisão automatizada de baixo impacto, reversível pelo usuário; transparência recomendada (Art. 20) |
| RIPD | N/A |
| Owner | Pendente |

### A009 — Histórico, evolução e estatísticas

| Campo | Valor |
|---|---|
| Slug | a009-evolucao |
| Finalidade | Mostrar calendário, sequência de semanas, volume, 1RM estimado e recordes pessoais |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não — ver nota \*\* |
| Dados | derivados de A007 (volume, 1RM, recordes, streak) |
| Fonte | Inferido (cálculos no banco e no aparelho) |
| Sistemas | RPCs (`get_streak`, `get_exercise_history`, …); cópia no IndexedDB (A011) |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Calculado sob demanda; cópia local limpa ao sair |
| Segurança | RLS; sem perfilamento para terceiros nem publicidade |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A010 — Medidas corporais

| Campo | Valor |
|---|---|
| Slug | a010-medidas |
| Finalidade | Acompanhar as próprias circunferências ao longo do tempo (área privada do perfil) |
| Base legal | Proposta: Art. 11, I — consentimento específico e destacado |
| Categorias de titulares | Usuários que ativarem o módulo |
| Sensíveis? | **Sim — dado referente à saúde (Art. 5º, II)** |
| Dados | data e circunferências em cm (8 músculos; braços e pernas com os dois lados). Peso, % de gordura e observação existem no banco mas **não são coletados** (sem tela) |
| Fonte | Coletado do titular |
| Sistemas | `body_measurements`, `measurement_values` |
| Operadores | Supabase |
| Transferência intl. | Não (Supabase em `sa-east-1` desde 2026-10-16) |
| Retenção | Até revogar o consentimento (apaga na hora) ou excluir a conta |
| Segurança | Só o dono lê (RLS); gravar exige o consentimento da versão vigente (RLS + RPC `save_body_measurement`, GM001); nunca no perfil social, competição, GUF AI, cópia offline, logs ou analytics; revogação apaga tudo |
| Alto risco? | Critério específico atendido (dado sensível); critério geral (larga escala / afetar significativamente) ainda não (Res. 2/2022 Art. 4º) |
| RIPD | `RIPD/ripd-medidas-corporais.md` v0.1 (2026-10-22) |
| Owner | Pendente |

### A011 — Dados guardados no aparelho (PWA offline)

| Campo | Valor |
|---|---|
| Slug | a011-armazenamento-local |
| Finalidade | Permitir treinar sem internet e abrir o app rápido |
| Base legal | Proposta: Art. 7º, V |
| Categorias de titulares | Usuários |
| Sensíveis? | Não (confirmado em 2026-10-22: as medidas não são guardadas no aparelho; só na memória da tela) |
| Dados | sessão do Supabase, treino em andamento, fila de gravações, cópias de histórico/resumos/evolução, preferências (tema, alerta, tela ligada) |
| Fonte | Gerado pelo app no aparelho do titular |
| Sistemas | localStorage, IndexedDB (Dexie), cache do service worker (só arquivos do app) |
| Operadores | Nenhum (fica no aparelho) |
| Transferência intl. | Não |
| Retenção | Até sair da conta (limpa cache, treino ativo e IndexedDB); preferências ficam no aparelho |
| Segurança | Service worker nunca cacheia respostas do Supabase; sem cookies de terceiros |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A012 — Registros de acesso e segurança

| Campo | Valor |
|---|---|
| Slug | a012-registros-acesso |
| Finalidade | Segurança, prevenção a fraude e guarda legal de registros de acesso |
| Base legal | Proposta: Art. 7º, II (Marco Civil, art. 15) e Art. 7º, IX (segurança) — validar ⚖ |
| Categorias de titulares | Usuários e visitantes do site |
| Sensíveis? | Não |
| Dados | IP, data/hora, user-agent, eventos de login (logs do Supabase Auth/API); logs de acesso da hospedagem |
| Fonte | Observado |
| Sistemas | Logs do Supabase; logs da Vercel/Cloudflare; `console.error` da Edge Function (só `userId`) |
| Operadores | Supabase, Vercel (testes), Cloudflare (produção prevista) |
| Transferência intl. | Sim — Vercel/Cloudflare; Supabase a confirmar |
| Retenção | **A definir**: política promete 6 meses; retenção real depende do plano de cada operador (G9) |
| Segurança | Acesso ao painel restrito (verificar MFA da conta administradora) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A013 — Exportação de dados

| Campo | Valor |
|---|---|
| Slug | a013-exportacao |
| Finalidade | Atender acesso e portabilidade (Art. 18, II e V) |
| Base legal | Art. 7º, II (cumprimento de obrigação legal — Art. 18) |
| Categorias de titulares | Usuários |
| Sensíveis? | Sim, se houver medidas |
| Dados | Todo o conteúdo de `export_my_data()` (`guf-export/2`: conta, contas vinculadas, períodos ativos, consentimentos — G12 resolvido na F5) |
| Fonte | Banco |
| Sistemas | RPC `export_my_data`; arquivo JSON gerado no aparelho (`guf-meus-dados-AAAA-MM-DD.json`) |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Não é guardado no servidor; conteúdo nunca vai para logs |
| Segurança | Só usuário logado, só os próprios dados |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A014 — Exclusão de conta

| Campo | Valor |
|---|---|
| Slug | a014-exclusao-conta |
| Finalidade | Atender eliminação (Art. 18, VI) |
| Base legal | Art. 7º, II |
| Categorias de titulares | Usuários |
| Sensíveis? | Sim, se houver medidas |
| Dados | id do usuário; apaga tudo em cascata |
| Fonte | Pedido do titular (digitar EXCLUIR) |
| Sistemas | Edge Function `delete-account` → `auth.admin.deleteUser`; cascata em todas as tabelas |
| Operadores | Supabase |
| Transferência intl. | Provável (G8) |
| Retenção | Imediata no banco (cascata); foto do Storage apagada pela função (G18, F8); prova dos aceites em `consent_proofs` (G6, F3); backups conforme o plano (G15) |
| Segurança | Token validado no servidor; `service_role` só na função; CORS por lista (`ALLOWED_ORIGINS`, F7) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A015 — Planos e direitos de acesso (pagamento futuro)

| Campo | Valor |
|---|---|
| Slug | a015-planos |
| Finalidade | Liberar o que o plano do titular inclui (limites do Free, recursos do Pro) e, quando houver pagamento, gerir a assinatura |
| Base legal | Art. 7º, V (plano e assinatura); registros de pagamento exigidos pela lei fiscal: Art. 7º, II ⚖ |
| Categorias de titulares | Todos os usuários (plano Free é o padrão, sem linha no banco); assinantes no futuro |
| Sensíveis? | Não (dados de cartão ficam no prestador de pagamento, nunca no banco do guf) |
| Dados | `plan_grants`: plano, origem (assinatura, manual, teste), início, validade, revogação · `subscriptions` (futuro): situação, código no prestador, fim do período pago · aceite dos Termos da Assinatura (`consent_records`, source `subscribe`) |
| Fonte | O app (plano padrão), o suporte (direito manual, `grant_plan`) e, no futuro, o webhook do prestador (`apply_subscription_event`) |
| Sistemas | `plans`, `features`, `plan_features` (catálogo público, sem dado pessoal), `plan_grants`, `subscriptions`; cópia do plano no aparelho (IndexedDB) até sair da conta |
| Operadores | Supabase; futuro prestador de pagamento ([PRESTADOR DE PAGAMENTO], avaliar em `vendors/` antes de lançar) |
| Transferência intl. | Nenhuma hoje; avaliar a do prestador de pagamento |
| Retenção | Enquanto a conta existir (cascata na exclusão); concessões e revogações no `audit_log` (5 anos, sem dado pessoal nos detalhes); registros fiscais ficam com o prestador pelo prazo legal ⚖ |
| Exportação | `export_my_data` formato `guf-export/6` (bloco `plano`: plano atual, direitos e assinaturas) |
| Segurança | Sem escrita pelo usuário (só servidor) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente |

### A016 — Registro de auditoria (prestação de contas)

| Campo | Valor |
|---|---|
| Slug | a016-auditoria |
| Finalidade | Comprovar que consentimentos, revogações, exportações e exclusões foram registrados e atendidos; apoiar a apuração de incidentes |
| Base legal | Proposta: Art. 7º, II (Art. 6º, X — responsabilização; Res. 15/2024 Art. 10) e Art. 7º, VI após a exclusão da conta ⚖ |
| Categorias de titulares | Usuários e ex-usuários |
| Sensíveis? | Não (registra só a contagem de medidas apagadas, nunca os valores) |
| Dados | id interno da conta (sem FK), tipo do evento, data/hora, tipo de ator, documento/versão, contagens, hashes da cadeia |
| Fonte | Gerado pelo banco (gatilhos) |
| Sistemas | `audit_log` |
| Operadores | Supabase |
| Transferência intl. | Não (banco em `sa-east-1`) |
| Retenção | 5 anos, eliminação mensal automática (`purge-expired-audit-log`) ⚖ |
| Segurança | Sem acesso pelo app; só inclusão; cadeia de hash (`verify_audit_log()`) |
| Alto risco? | Não |
| RIPD | N/A |
| Owner | Pendente (controlador) |

### A017 — Perfil social e seguidores

| Campo | Valor |
|---|---|
| Slug | a017-seguidores |
| Finalidade | Perfil com @, nome e foto encontrável na busca, e escolher quem acompanha o progresso: seguir, pedir, aceitar, remover e bloquear pessoas |
| Base legal | Proposta: Art. 7º, V — perfil e vínculos são parte do serviço (Termos 0.2) ⚖ |
| Categorias de titulares | Todos os usuários (perfil privado criado no cadastro); pessoas que o titular bloqueou (só o id) |
| Sensíveis? | Não |
| Dados | @usuário (aleatório no cadastro, editável), nome e foto (A004/A005), visibilidade (privada/aberta), opção de ocultar histórico, vínculos (quem segue quem, status, datas), bloqueios |
| Fonte | Coletado do titular |
| Sistemas | `social_profiles`, `follows`, `blocks` |
| Operadores | Supabase |
| Transferência intl. | Não (banco em `sa-east-1`) |
| Retenção | Enquanto a conta existir; seguidores até o titular remover; bloqueios até desbloquear; tudo apagado em cascata na exclusão |
| Segurança | RLS só de leitura do que é seu; gravação por funções com auditoria; busca só por prefixo do @ |
| Alto risco? | Avaliado — `RIPD/ripd-social.md` |
| RIPD | `.lgpd/RIPD/ripd-social.md` |
| Owner | Pendente (controlador) |

### A018 — Estatísticas e treinos visíveis a seguidores

| Campo | Valor |
|---|---|
| Slug | a018-compartilhamento-seguidores |
| Finalidade | Mostrar a seguidores aceitos (ou a qualquer conta logada, com o perfil aberto) estatísticas, sequência, evolução e, se o titular não ocultar, os registros de treino |
| Base legal | Proposta: Art. 7º, V — escolha do titular dentro do serviço (Termos 0.2 / Política 0.3, aceitos no cadastro); Art. 11, I se N1 confirmar dado de saúde ⚖ |
| Categorias de titulares | Usuários com seguidores aprovados ou perfil aberto |
| Sensíveis? | Não — ver nota \*\* (N1) ⚖ |
| Dados | Número de treinos, 1º treino, sequência de semanas, evolução semanal (volume, carga máxima, horas); treinos: data, nome, duração, séries, volume e nº de recordes. **Nunca**: medidas, observações, RPE, e-mail |
| Fonte | Derivado de A004, A005, A007 |
| Sistemas | Funções `get_member_profile`, `get_member_evolution`, `list_member_workouts` |
| Operadores | Supabase |
| Transferência intl. | Não |
| Retenção | Calculado sob demanda; nada é copiado para o seguidor além do cache do app dele (apagado ao sair da conta) |
| Segurança | Leitura só por funções `SECURITY DEFINER` que conferem você, seguidor aceito ou perfil aberto (`can_view_member`) e histórico visível (`can_view_member_history`); 32 testes de permissão no banco (2026-10-18) |
| Alto risco? | Avaliado — RIPD |
| RIPD | `.lgpd/RIPD/ripd-social.md` |
| Owner | Pendente (controlador) |

### A019 — Competição e pontuação semanal

| Campo | Valor |
|---|---|
| Slug | a019-competicao |
| Finalidade | Calcular a pontuação semanal (constância, sequência, recordes e volume) e o ranking mensal entre seguidores mútuos |
| Base legal | Proposta: Art. 7º, V (Termos 0.2, aceitos no cadastro) ⚖ |
| Categorias de titulares | Usuários que se seguem mutuamente |
| Sensíveis? | Não — ver nota \*\* (N1) ⚖ |
| Dados | Tempo efetivo, dia do treino no fuso do perfil, volume e recordes de carga das sessões; resultados: pontos (por parte), sessões válidas, posição. Sem esforço/RPE desde 2026-10-20 |
| Fonte | Derivado de A007 (registro de treinos) |
| Sistemas | `workout_sessions.session_rpe`, `competition_parameters`, funções `competition_*`, `get_competition_participants`, `get_competition_weeks`, `get_competition_days`, `get_my_competition_sessions` |
| Operadores | Supabase |
| Transferência intl. | Não |
| Retenção | Pontuação não é guardada (recalculada a cada consulta); `session_rpe` antigo sem uso, apagado com a conta |
| Segurança | Parâmetros fixos no servidor e públicos; horários do treino gravados só pelo servidor (gatilhos) |
| Decisão automatizada | Não desde 2026-10-20 (o controle de RPE suspeito saiu junto com o esforço); a pontuação é soma de regras fixas e públicas |
| Alto risco? | Avaliado — RIPD |
| RIPD | `.lgpd/RIPD/ripd-social.md` |
| Owner | Pendente (controlador) |

### A020 — Avisos no celular (Web Push): competição e seguidores

| Campo | Valor |
|---|---|
| Slug | a020-avisos-competicao |
| Finalidade | Avisar no aparelho quando alguém segue o titular, pede para seguir ou aceita o pedido dele, e quando um competidor fica a menos de 20 pontos de passá-lo na temporada ou passa |
| Base legal | Art. 7º, V, só se o titular ligar os avisos no aparelho (Política 0.4-dev) ⚖ |
| Categorias de titulares | Quem ligou as notificações (recebe); quem seguiu, pediu ou aceitou e os competidores (nome, @ e, na competição, diferença de pontos aparecem no aviso) |
| Sensíveis? | Não |
| Dados | Endereço do aparelho no serviço de push, chaves públicas do navegador (p256dh, auth), data da inscrição e do último aviso; posição relativa por par e temporada (ahead · close · behind); último aviso de seguidor por (destinatário, pessoa, tipo) |
| Fonte | Aparelho do titular (inscrição); derivado de A017 (vínculos) e A019 (posição) |
| Sistemas | `push_subscriptions`, `competition_alert_states`, `save_push_subscription`, `follow_alerts_sent`, `compute_competition_alerts`, `build_follow_alert`, gatilhos `on_workout_session_competition_alerts` e `on_follow_push_alert` (pg_net), Edge Function `push-alerts`, service worker (`apps/web/sw/sw.ts`) |
| Operadores | Supabase; o serviço de push do navegador (Google, Apple ou Mozilla) recebe só a mensagem cifrada e metadados ⚖ |
| Transferência intl. | Sim — serviço de push (EUA), só para quem ligou os avisos ⚖ |
| Retenção | Inscrição até desligar, sair da conta no aparelho, excluir a conta ou o serviço de push responder 404/410; estados só da temporada atual e da anterior; registro de avisos de seguidores por 1 dia |
| Segurança | Conteúdo cifrado (RFC 8291) e assinado (VAPID); RLS (titular lê e apaga só as suas; estados sem acesso pelo app) |
| Alto risco? | Avaliado — RIPD v0.4 |
| RIPD | `.lgpd/RIPD/ripd-social.md` |
| Owner | Pendente (controlador) |

---

## Checklist de qualidade
- [x] Toda tabela com FK para o usuário está coberta (14 tabelas + `auth.*`)
- [x] Toda integração de terceiro está listada (Supabase, Google, Vercel/Cloudflare; e-mail transacional do Supabase)
- [ ] Toda atividade tem base legal explícita — propostas; confirmar em L3
- [x] Atividades de alto risco flagadas (A010 → avaliar/RIPD)
- [x] Atividades com menores flagadas (todas "possível" até a avaliação ECA Digital — G11)
- [ ] Retenção definida sem "indefinido" — pendente em A003, A012, A015 e backups

## Novos achados desta etapa
- **N1** — Confirmar com o jurídico se cargas/reps/RPE (A007/A009) podem ser vistos como dado de saúde ⚖.
- **N2** — Serviço de e-mail transacional (confirmação/recuperação) também é operador: mapear em L4.
- **N3** — Campos de observação em texto livre podem receber dado sensível espontâneo; avaliar aviso discreto ou nada (baixo risco).
