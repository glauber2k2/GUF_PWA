# Notificações no celular (Web Push): competição e seguidores

# 0. Informações

Este documento descreve os avisos no celular (o que avisa, como funciona, custo, situação e configuração).

| Feito por | Glauber |
| --- | --- |
| Data de Criação | 19/10/2026 |

## O que avisa

Quem liga **Configurações › Preferências › Notificações** recebe avisos neste aparelho:

| Aviso | Quando | Para quem | Ao tocar |
|---|---|---|---|
| "Fulano está chegando" (ou "empatou com você") | Um competidor fica a menos de 20 pontos de passar você na temporada atual ("Este mês") | Quem está sendo alcançado | `/competicao` |
| "Fulano te ultrapassou" | Um competidor passa você na temporada atual | Quem foi ultrapassado | `/competicao` |
| "Novo seguidor" | Alguém começa a seguir seu perfil aberto | Quem foi seguido | Perfil de quem seguiu |
| "Pedido para seguir" | Alguém pede para seguir seu perfil privado | Quem recebeu o pedido | `/solicitacoes` |
| "Pedido aceito" | Quem você pediu para seguir aceitou (inclusive ao abrir o perfil, que aceita os pedidos pendentes) | Quem pediu | Perfil de quem aceitou |

- **Competição:** um aviso por mudança de posição e por competidor (`competition_alert_states`). Quem tem 0 pontos na temporada não recebe.
- **Seguidores:** no máximo 1 aviso a cada 24 h por pessoa, destinatário e tipo (`follow_alerts_sent`, guardado por 1 dia). O próprio gatilho confere e reserva o aviso antes de chamar a função: seguir, deixar de seguir e seguir de novo em menos de 24 h gera 1 aviso e 1 requisição só. Só sai se o vínculo ainda está como no evento e não há bloqueio. Recusar, remover e bloquear não avisam ninguém.

## Como funciona

```mermaid
flowchart TD
  A["Treino concluído ou RPE informado<br/>(workout_sessions)"] --> G1["Gatilho on_workout_session_competition_alerts<br/>só se algum competidor tem aparelho inscrito"]
  B["Seguir, pedir ou aceitar<br/>(follows: insert; pending → accepted)"] --> G2["Gatilho on_follow_push_alert<br/>só se o destinatário tem aparelho inscrito<br/>e o mesmo aviso não saiu nas últimas 24 h"]
  G1 --> P["post_push_alert → pg_net<br/>(depois do commit, em segundo plano)"]
  G2 --> P
  P --> F["Edge Function push-alerts<br/>(cabeçalho x-guf-secret)"]
  F --> C["compute_competition_alerts<br/>ou build_follow_alert (só service_role)"]
  C --> W["Push cifrado e assinado (VAPID)<br/>para push_subscriptions"]
  W -->|404 / 410| D["Apaga a inscrição"]
  W --> S["Service worker mostra a notificação<br/>toque abre a tela do aviso"]
```

- **Banco:** `supabase/migrations/20261019225621_push_alerts.sql` (`push_subscriptions`, `competition_alert_states`, `follow_alerts_sent`, `save_push_subscription`, `compute_competition_alerts`, `build_follow_alert`, `post_push_alert`, gatilhos `on_workout_session_competition_alerts` e `on_follow_push_alert`, `export_my_data` no formato `guf-export/4`) e `20261019232551_push_alerts_follow_cooldown.sql` (intervalo de 24 h dos avisos de seguidores conferido no gatilho).
- **Edge Function:** `supabase/functions/push-alerts/index.ts` (textos dos avisos em português).
- **App:** `packages/api/src/push.ts` (`PushApi`), `apps/web/src/shared/push/web-push.ts` (inscrição do aparelho), `features/profile/hooks/use-push-alerts.ts` + `components/push-alerts-row.tsx`, eventos `push` e `notificationclick` em `apps/web/sw/sw.ts`. Sair da conta apaga a inscrição no servidor e a cancela no navegador (`AuthProvider`).
- **Limite do iPhone:** só com o app instalado na Tela de Início (iOS 16.4+). No `next dev` não há service worker: a opção aparece como indisponível (use `/configuracoes?estado=padrao` para simular).

## Custo

Uma chamada da Edge Function por evento que tem destinatário com notificações ligadas (treino concluído, RPE informado, seguir, pedir, aceitar). Ex.: 1.000 usuários × (15 treinos + ~10 eventos de seguidores) por mês ≈ 25 mil chamadas, contra 500 mil no Free e 2 milhões no Pro. pg_net e a entrega do push (Google/Apple/Mozilla) não custam nada.

## Situação (2026-10-19)

| Etapa | Situação |
|---|---|
| Migrations `push_alerts`, `legal_privacy_push_alerts` e `push_alerts_follow_cooldown` | Aplicadas no projeto vinculado em 2026-10-19 |
| Tipos do banco (`packages/types/src/database.ts`) | Regenerados com `supabase gen types` em 2026-10-19 |
| Política de Privacidade 0.4-dev | Publicada no banco em 2026-10-19: quem já tem conta passa pelo `/aceite`; até o app novo estar no ar, o `/aceite` mostra o texto anterior |
| Chaves VAPID, secrets da função, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e segredos do Vault | Pendente (passos 1, 2, 3 e 5) |
| Deploy da Edge Function `push-alerts` | Pendente (passo 4) |

Enquanto os segredos do Vault não existem, os gatilhos não chamam nada: o app funciona normalmente e a opção "Notificações" só aparece disponível no build com a chave pública.

## Configuração (uma vez por ambiente)

1. Chaves VAPID: `node supabase/scripts/generate-vapid-keys.mjs > vapid.json` (o JSON tem a chave privada: está no `.gitignore`; apagar depois). A linha `NEXT_PUBLIC_VAPID_PUBLIC_KEY=…` sai no terminal.
2. App: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` no `apps/web/.env.local` e nas variáveis da Vercel.
3. Secrets da função:
   ```
   npx supabase secrets set VAPID_KEYS="$(cat vapid.json)" VAPID_SUBJECT="mailto:<contato>" PUSH_ALERTS_SECRET=<segredo aleatório>
   ```
4. Publicar: `npx supabase db push` (feito em 2026-10-19 no projeto vinculado) e `npx supabase functions deploy push-alerts --no-verify-jwt --use-api`.
5. Vault (SQL Editor; segredos não vão em migration):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<mesmo segredo do passo 3>', 'push_alerts_secret');
   ```
   Sem esses dois segredos, os gatilhos não fazem nada.
6. Regenerar os tipos (`packages/types/src/database.ts`) depois de aplicar as migrations (feito em 2026-10-19).

## LGPD

Atividade A020 em `.lgpd/data-map.md`; RIPD social v0.4 (riscos R010–R013); Política de Privacidade 0.4-dev (`20261019230418_legal_privacy_push_alerts`, publicada no banco em 2026-10-19); serviços de push em `.lgpd/vendors/push-services.md`.
