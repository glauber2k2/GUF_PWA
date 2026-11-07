# Supabase: funções RPC e Edge Functions

> Detalhes de implementação que saíram do `CLAUDE.md` (índice em "Funcionalidades: onde ler os detalhes").
> Ler inteiro antes de mexer nesta funcionalidade e atualizar no mesmo PR quando o código mudar.

Funções RPC:
| Função | Uso |
|---|---|
| `pending_documents()` | Portão /aceite (termos, privacidade, idade pendentes) |
| `accept_documents(p_document_ids, p_source, p_platform)` | Registrar aceite (só versões vigentes; versão desatualizada → erro 22023) |
| `has_health_consent()` / `grant_health_consent(p_platform)` / `revoke_health_consent(p_platform)` | Módulo de medidas (revogar apaga as medidas) |
| `get_last_performance(p_exercise_ids)` | Coluna "anterior" no treino (carga/reps e, no cardio, `distance_km`/`duration_seconds`) |
| `pause_workout(p_session_id, p_at)` / `resume_workout(p_session_id, p_at)` | Pausar/retomar (idempotentes; `p_at` = hora real da ação, para envio offline; o servidor limita a horários válidos) |
| `finish_workout(p_session_id)` | Finaliza treino: fecha o período aberto, grava `active_seconds`; retorna resumo (`duration_seconds` = tempo efetivo, `elapsed_seconds`, `pauses`) + `personal_records` |
| `activate_project(p_project_id)` | Ativa o projeto e desativa o anterior na mesma transação (um ativo por usuário). Erro próprio `GP001` = projeto não encontrado ou arquivado (não usar os códigos de treino) |
| `update_routine_from_workout(p_session_id)` | Depois de finalizar: os exercícios e séries do treino viram os da rotina dele (erros P0002, GP003, GP004) |
| `save_routine(p_routine_id, p_project_id, p_name, p_weekdays, p_exercises, p_auto_progress)` | Cria (`p_routine_id` nulo) ou atualiza a rotina e seus exercícios planejados numa transação; mudar de projeto põe a rotina no fim da lista. Repetições em `target_reps_min`/`target_reps_max` de cada item (o texto `target_reps` do app antigo é convertido por `rep_target_from_item`; texto vazio mantém o salvo). Erros GP001, GP003, GP004 |
| `parse_rep_target(p_text)` · `rep_target_from_item(p_item)` · `rep_target_in_item(p_item)` | Apoio das RPCs de rotina e de importação de ficha: texto antigo das repetições ("8-12") → mínimo e máximo |
| `get_exercise_history(p_exercise_id, p_from)` / `get_exercise_records(p_exercise_id)` | Evolução e recordes |
| `get_training_days(p_from, p_to)` | Calendário |
| `get_streak()` | `current_streak`, `best_streak`, `current_week_count`, `week_secured`, `streak_at_risk` |
| `my_entitlements()` · `effective_plan()` · `has_feature(p_feature)` · `feature_limit(p_feature)` | Plano efetivo e o que ele libera (`enabled`, `limit`, `upgradable`); `is_premium()` mantida por compatibilidade |
| `pending_subscription_documents()` | Documentos a aceitar na assinatura (Termos da Assinatura + pendências do cadastro) |
| `grant_plan(...)` · `revoke_plan_grant(p_grant_id)` | Só service_role (suporte): direitos de plano sem pagamento, auditado |
| `my_billing()` | Assinatura (com prazo de desistência e valor a devolver), pagamentos e devoluções do próprio usuário |
| `billing_*` · `withdrawal_window` · `purge_expired_billing` | Só service_role (Edge Functions `billing` e `billing-webhook`): espelho da assinatura, pagamentos, devoluções, contestações e a regra dos 7 dias |
| `auto_finish_idle_workouts(p_idle)` | Só servidor (pg_cron, a cada 5 min): finaliza treinos ociosos de quem ligou `auto_finish_workout` |
| `average_duration_seconds` (campo calculado de `routines`) | Tempo médio da rotina (últimos 5 treinos concluídos); usar no select: `routines(id, average_duration_seconds)` |
| `export_my_data()` | Exportar meus dados (JSON, formato `guf-export/7`: inclui plano, direitos e assinaturas, perfil social, vínculos, bloqueios, aparelhos com avisos, conversas do GUF AI, comunicados, suspensões e exclusão agendada) |
| `save_push_subscription(p_endpoint, p_p256dh, p_auth)` | Inscreve este aparelho nos avisos (o mesmo aparelho de outra conta passa para a atual); desinscrever = `delete` em `push_subscriptions` (RLS) |
| `compute_competition_alerts(p_user_id)` · `build_follow_alert(p_follower_id, p_followee_id, p_kind)` | Só service_role (Edge Function `push-alerts`): avisos de competidor chegando/ultrapassando e de seguidores |
| `get_my_social()` · `update_social_handle(p_handle)` · `update_social_settings(p_visibility, p_history_hidden)` | Meu @, visibilidade, histórico e contagens; abrir aceita os pedidos pendentes, fechar mantém os seguidores |
| `request_follow` · `respond_follow_request` · `unfollow` · `remove_follower` · `block_user` · `unblock_user` | Vínculos (gravação só por estas funções; auditoria no `audit_log`) |
| `list_social_connections(p_kind, p_user_id)` · `search_social_profiles(p_query)` · `find_social_profile(p_handle)` | Listas (followers · following · requests · sent · blocked), busca e id pelo @ |
| `get_member_profile(p_user_id)` · `get_member_evolution` · `list_member_workouts` | Perfil (nulo = o seu): cartão para todos (com a bio); objetivos e experiência só desbloqueado; números, sequência (`streak_for`), evolução semanal e treinos conforme a permissão (GS004/GS006) |
| `clear_uploaded_avatar()` | Remove a foto enviada: `profiles.avatar_url` volta para a foto da conta social mais recente (ou nulo); o app apaga os arquivos do bucket `avatars` |
| `get_member_workout(p_session_id)` | Treino concluído de outra pessoa (jsonb: dono, séries concluídas, recordes pelo 1RM, treinos do dia), com as observações dos exercícios (se o dono aceitou os Termos 1.3), sem RPE, projeto ou rotina; exige `can_view_member_history` (GS009/GS006) |
| `save_workout_edit(p_session_id, p_active_seconds, p_note, p_exercises)` | Salva a edição de um treino concluído do próprio usuário numa transação (tempo efetivo 1 min–24 h, observação, exercícios e séries concluídas, com distância e tempo no cardio; o resto sai). SECURITY DEFINER: único caminho para mudar o tempo de um treino concluído. Erros GW001–GW003 |
| `import_training_plan(p_project_id, p_project_name, p_activate, p_new_exercises, p_routines)` | Importar ficha: cria (ou usa) o projeto, os exercícios novos e as rotinas (via `save_routine`) numa transação. SECURITY INVOKER (RLS e limites do plano). Rotina com `routine_id`: os exercícios entram no fim dessa rotina do projeto, sem repetir (migration `20261024110000_plan_import_into_routine`; apoio `plan_import_exercise_id` e `plan_import_append_to_routine`). Exercício só do catálogo do guf ou da própria pessoa (GI001); "novo" com o mesmo nome de um existente reaproveita. Erros GI001, GI002, GP001, GP003, GP004, GL001 |
| `save_body_measurement(p_measured_on, p_values)` | Medidas de um dia (cm por local; `null` apaga o local). SECURITY INVOKER (RLS); exige o consentimento de saúde vigente (GM001); data futura GM002; local ou valor inválido GM003 |
| `my_announcements()` · `mark_announcement(p_id, p_event)` | App: comunicados que valem agora para quem pergunta (o banco avalia o público; nunca devolve a regra) e visto/fechado/botão |
| `admin_me()` · `admin_*` (busca, conta, e-mail, @, nome, plano, desvincular login, suspender, excluir/agendar exclusão, redefinir senha, equipe, auditoria, comunicados, alcance) | Só o painel (`@guf/api/admin`); cada uma confere colaborador + `aal2` + papel e audita. `register_staff_member` só service_role |
| `admin_list_exercises(p_query, p_muscle_groups, p_limit, p_offset)` · `admin_existing_exercise_names(p_names)` · `admin_create_exercises(p_exercises, p_source)` | Painel: catálogo de exercícios do guf (listar Leitura+; cadastrar em lote Admin, auditado como `staff_created_exercises`) |
| `admin_exercise_usage(p_id)` · `admin_update_exercise(p_id, p_name, p_muscle_group, p_equipment)` · `admin_delete_exercise(p_id)` | Painel: uso em números (Leitura+), editar e excluir/arquivar (Admin), auditados como `staff_updated_exercise`/`staff_deleted_exercise` |
| `guard_suspended_account()` | Middleware do PostgREST (`pgrst.db_pre_request`): GU001 para conta com suspensão aberta; não é chamada pelo app |
| `get_competition_participants()` · `get_competition_weeks(p_from, p_to)` · `get_competition_days(p_from, p_to)` | Você + competidores, pontos por semana (com as partes) e treinos/volume/recordes por dia |
| `get_my_points_statement(p_from, p_to)` | Extrato de pontos do próprio usuário (jsonb: `visible_from`, semanas com as partes, treinos com `is_valid`/`counted`); até 400 dias; limite do plano no banco. Usada pela tela do extrato e pelo GUF AI |

Edge Function `push-alerts`: chamada só pelo banco (gatilhos `on_workout_session_competition_alerts` e `on_follow_push_alert` → `post_push_alert` + pg_net, cabeçalho `x-guf-secret`); deploy com `--no-verify-jwt`. Configuração (VAPID, secrets, Vault) em `docs/push-notifications.md`.

Edge Function `guf-ai`: GUF AI (ver a seção própria); chamada pelo app com o token do usuário (`client.functions.invoke`, resposta em stream).

Edge Function `admin-delete-account`: exclusão de conta pelo painel e das exclusões agendadas; cancela a assinatura no Stripe antes (o banco recusa conta com assinatura viva, GA023). Secrets `ACCOUNT_CLOSURE_SECRET` (igual ao `account_closure_secret` do Vault), `ALLOWED_ORIGINS`, `STRIPE_*`. Deploy com `--no-verify-jwt --use-api` (o banco confere o colaborador; o job não tem JWT).

Edge Function `admin-reset-password`: chamada pelo painel com o token do colaborador; manda o e-mail de redefinição (service_role só dentro dela). Secrets `APP_URL`, `ALLOWED_ORIGINS`. Deploy com `--use-api`.

Edge Functions `billing` e `billing-webhook`: assinatura paga (ver Planos). Secrets `STRIPE_SECRET_KEY` (chave restrita), `STRIPE_WEBHOOK_SECRET`, `APP_URL`; deploy em `docs/stripe-payments-plan.md` § 11.4.

Edge Function: `delete-account` → `supabase.functions.invoke('delete-account', { method: 'POST' })` e depois `signOut()`.
- CORS da `delete-account` por lista no secret `ALLOWED_ORIGINS` (`npx supabase secrets set ALLOWED_ORIGINS="https://<app>,http://localhost:3000"`); sem o secret, aceita qualquer origem. Publicar com `npx supabase functions deploy delete-account --use-api`.
- Cabeçalhos de segurança da hospedagem (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) em `vercel.json` (raiz e `apps/web`, até confirmar o Root Directory da Vercel; na Cloudflare, recriar em `_headers`: `apps/web/public/_headers`, manter igual ao `vercel.json`). Checklist em `.lgpd/security-checklist.md`.
