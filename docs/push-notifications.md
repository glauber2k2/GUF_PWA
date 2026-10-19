# Notificações no celular (Web Push): competição e seguidores

Quem liga **Configurações › Preferências › Notificações** recebe avisos neste aparelho:

| Aviso | Quando | Para quem | Ao tocar |
|---|---|---|---|
| "Fulano está chegando" (ou "empatou com você") | Um competidor fica a menos de 20 pontos de passar você na temporada atual ("Este mês") | Quem está sendo alcançado | `/competicao` |
| "Fulano te ultrapassou" | Um competidor passa você na temporada atual | Quem foi ultrapassado | `/competicao` |
| "Novo seguidor" | Alguém começa a seguir seu perfil aberto | Quem foi seguido | Perfil de quem seguiu |
| "Pedido para seguir" | Alguém pede para seguir seu perfil privado | Quem recebeu o pedido | `/solicitacoes` |
| "Pedido aceito" | Quem você pediu para seguir aceitou (inclusive ao abrir o perfil, que aceita os pedidos pendentes) | Quem pediu | Perfil de quem aceitou |

- **Competição:** um aviso por mudança de posição e por competidor (`competition_alert_states`). Quem tem 0 pontos na temporada não recebe.
- **Seguidores:** no máximo 1 aviso por dia por pessoa e tipo (`follow_alerts_sent`, guardado por 1 dia), para seguir e deixar de seguir repetidamente não virar assédio. Só sai se o vínculo ainda está como no evento e não há bloqueio. Recusar, remover e bloquear não avisam ninguém.

## Como funciona

```
treino concluído / RPE informado (workout_sessions) ─┐
mudança em follows (insert; pending → accepted) ─────┤
                                                     └─ gatilho (só se quem receberia tem aparelho inscrito)
                                                          └─ post_push_alert → pg_net → Edge Function push-alerts (x-guf-secret)
                                                               ├─ compute_competition_alerts / build_follow_alert (só service_role)
                                                               └─ envia o push (@negrel/webpush, VAPID) para push_subscriptions
                                                                    404/410 → apaga a inscrição
```

- **Banco:** `supabase/migrations/20261019225621_push_alerts.sql` (`push_subscriptions`, `competition_alert_states`, `follow_alerts_sent`, `save_push_subscription`, `compute_competition_alerts`, `build_follow_alert`, `post_push_alert`, gatilhos `on_workout_session_competition_alerts` e `on_follow_push_alert`, `export_my_data` no formato `guf-export/4`).
- **Edge Function:** `supabase/functions/push-alerts/index.ts` (textos dos avisos em português).
- **App:** `packages/api/src/push.ts` (`PushApi`), `apps/web/src/shared/push/web-push.ts` (inscrição do aparelho), `features/profile/hooks/use-push-alerts.ts` + `components/push-alerts-row.tsx`, eventos `push` e `notificationclick` em `apps/web/sw/sw.ts`. Sair da conta apaga a inscrição no servidor e a cancela no navegador (`AuthProvider`).
- **Limite do iPhone:** só com o app instalado na Tela de Início (iOS 16.4+). No `next dev` não há service worker: a opção aparece como indisponível (use `/configuracoes?estado=padrao` para simular).

## Custo

Uma chamada da Edge Function por evento que tem destinatário com notificações ligadas (treino concluído, RPE informado, seguir, pedir, aceitar). Ex.: 1.000 usuários × (15 treinos + ~10 eventos de seguidores) por mês ≈ 25 mil chamadas, contra 500 mil no Free e 2 milhões no Pro. pg_net e a entrega do push (Google/Apple/Mozilla) não custam nada.

## Configuração (uma vez por ambiente)

1. Chaves VAPID: `node supabase/scripts/generate-vapid-keys.mjs > vapid.json` (o JSON tem a chave privada: está no `.gitignore`; apagar depois). A linha `NEXT_PUBLIC_VAPID_PUBLIC_KEY=…` sai no terminal.
2. App: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` no `apps/web/.env.local` e nas variáveis da Vercel.
3. Secrets da função:
   ```
   npx supabase secrets set VAPID_KEYS="$(cat vapid.json)" VAPID_SUBJECT="mailto:<contato>" PUSH_ALERTS_SECRET=<segredo aleatório>
   ```
4. Publicar: `npx supabase db push` e `npx supabase functions deploy push-alerts --no-verify-jwt --use-api`.
5. Vault (SQL Editor; segredos não vão em migration):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<mesmo segredo do passo 3>', 'push_alerts_secret');
   ```
   Sem esses dois segredos, os gatilhos não fazem nada.
6. Regenerar os tipos (`packages/types/src/database.ts`); os tipos das tabelas novas foram escritos à mão até lá.

## LGPD

Atividade A020 em `.lgpd/data-map.md`; RIPD social v0.4 (riscos R010–R013); Política de Privacidade 0.4-dev (`20261019230418_legal_privacy_push_alerts`, publicar junto com o app); serviços de push em `.lgpd/vendors/push-services.md`.
