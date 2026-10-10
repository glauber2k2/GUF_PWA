# Guf App — Contexto do projeto

App PWA de evolução fitness (musculação). Interface em **português do Brasil**. Mobile first.
Usuário registra treinos NA ACADEMIA, com uma mão, entre séries: registrar uma série deve levar menos de 3 segundos.

## Funcionalidades do MVP
- Autenticação: e-mail/senha e Google, com vinculação do Google a conta existente
- Projetos (grupos de rotinas) → Rotinas (exercícios planejados com séries/reps/descanso)
- Treino por rotina OU treino livre (sem rotina); registro de carga, repetições e tipo de série
- Histórico por exercício (carga máxima, volume, 1RM estimado, recordes pessoais)
- Calendário de dias treinados; streak de semanas
- Medidas corporais (módulo opcional com consentimento LGPD específico)
- Privacidade: exportar dados, revogar consentimento, excluir conta

## Stack
- Monorepo: Turborepo + pnpm
- Web: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Dados: @supabase/supabase-js + TanStack Query
- Formulários: React Hook Form + Zod (integração via @hookform/resolvers)
- Gráficos: Recharts · Datas: date-fns · Ícones: lucide-react
- Animações: Anime.js (v4), React Bits, Motion — sempre respeitando prefers-reduced-motion
- PWA: Serwist · Offline do treino em andamento: Dexie (IndexedDB)
- Hospedagem: Cloudflare Pages (site estático)
- Futuro: app React Native (Expo) reaproveitando os pacotes compartilhados

## Estrutura
```
guf-app/
├── apps/web/            # Next.js PWA
├── packages/core/       # regras de negócio puras (1RM, volume, PR, formatações) — sem React
├── packages/schemas/    # schemas Zod compartilhados
├── packages/api/        # cliente Supabase + funções de consulta (usadas por web e mobile)
├── packages/types/      # tipos gerados do banco (src/database.ts)
├── supabase/            # migrations, seed e Edge Functions (backend JÁ PRONTO)
└── design/              # referências exportadas do Claude Design
```

## Regras de arquitetura (OBRIGATÓRIAS)
1. **Site estático:** `output: "export"` no Next.js. NÃO usar Server Actions, Route Handlers, middleware de servidor ou SSR com dados. Tudo roda no cliente.
2. **Rotas dinâmicas:** evitar `/treino/[id]`. Usar rotas fixas com query string (`/treino?id=...`) lidas com `useSearchParams` (envolver em `<Suspense>`).
3. **Segurança no banco:** o RLS do Supabase protege os dados. No front, usar APENAS a chave `anon` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). NUNCA usar `service_role` no front.
4. **Lógica reutilizável fora do app web:** cálculos em `packages/core`, validações em `packages/schemas`, consultas em `packages/api`. Componentes React ficam em `apps/web`.
5. **Não alterar o banco pelo front nem pelo painel.** Mudanças de schema só via nova migration em `supabase/migrations/` (`npx supabase migration new nome`). Não editar migrations já existentes.
6. **Tipos do banco:** importar de `packages/types/src/database.ts`. Regenerar com `npx supabase gen types typescript --linked > packages/types/src/database.ts` após qualquer migration.

## Backend (Supabase) — já implementado
Tabelas: profiles, exercises, projects, routines, routine_exercises, workout_sessions, session_exercises, set_logs, body_measurements, measurement_values, legal_documents, consent_records, entitlements.

Preenchidos por gatilho (NÃO enviar): `user_id` em routine_exercises, session_exercises e measurement_values; `user_id`, `session_id`, `exercise_id` e `completed_at` em set_logs. Perfil e plano são criados automaticamente no cadastro.

Funções RPC:
| Função | Uso |
|---|---|
| `pending_documents()` | Portão /aceite (termos, privacidade, idade pendentes) |
| `accept_documents(p_document_ids, p_source, p_platform)` | Registrar aceite |
| `has_health_consent()` / `grant_health_consent(p_platform)` / `revoke_health_consent(p_platform)` | Módulo de medidas (revogar apaga as medidas) |
| `get_last_performance(p_exercise_ids)` | Coluna "anterior" no treino |
| `finish_workout(p_session_id)` | Finaliza treino; retorna resumo + `personal_records` |
| `get_exercise_history(p_exercise_id, p_from)` / `get_exercise_records(p_exercise_id)` | Evolução e recordes |
| `get_training_days(p_from, p_to)` | Calendário |
| `get_streak()` | `current_streak`, `best_streak`, `current_week_count`, `week_secured`, `streak_at_risk` |
| `is_premium()` | Planos pagos (futuro) |
| `export_my_data()` | Exportar meus dados (JSON) |

Edge Function: `delete-account` → `supabase.functions.invoke('delete-account', { method: 'POST' })` e depois `signOut()`.

## Regras de negócio
- **Peso sempre em kg no banco**; conversão para lb só na exibição (`profiles.weight_unit`).
- **performed_on** = data LOCAL do usuário (`format(new Date(), 'yyyy-MM-dd')`), nunca deixar o padrão do banco (UTC).
- **Um treino em andamento por vez** (o banco recusa outro): ao abrir o app, retomar o treino aberto.
- **Um projeto ativo por usuário:** desativar o atual antes de ativar outro.
- **Trocar exercício de um treino:** apagar o session_exercise e criar outro.
- **Streak:** semana (seg–dom) conta com ≥ 1 treino concluído; semana inteira sem treino zera. `weekly_goal` é só para exibição.
- **1RM estimado:** Epley — carga × (1 + reps / 30). Aquecimentos não contam.
- **Primeira vez de um exercício não gera PR.**

## LGPD (não negociável)
- Cadastro: checkbox "Tenho 18 anos ou mais" + checkbox "Li e aceito os Termos de Uso e a Política de Privacidade", ambas desmarcadas; botão desabilitado até marcar.
- Login com Google: após o primeiro acesso, se `pending_documents()` retornar algo → redirecionar para /aceite antes de liberar o app.
- Consentimento de saúde em camadas: resumo SEMPRE visível (5 itens) + "Ler termo completo" expansível + checkbox desmarcada + botões "Agora não" e "Autorizar e continuar" com o MESMO peso visual.
- Nunca enviar dados de medidas para logs, Sentry ou analytics.

## Design
- Seguir o design system do Guf (Claude Design) e as referências em `design/`.
- Verde volt `#C6F432` = ação, seleção e conquista. Texto escuro sobre volt. No tema claro, textos/ícones usam verde mais escuro (contraste AA).
- Tema escuro padrão (`#0B0D10`, superfícies `#14171C` / `#1C2027`); tema claro equivalente (`#F6F7F9`). Cores sempre como tokens (variáveis CSS), nunca soltas.
- Toques ≥ 44px; ações de treino ≥ 56px; ação principal na zona do polegar.
- Bottom navigation: Início, Histórico, Treinar (central), Projetos, Perfil.
- Acessibilidade WCAG AA, foco visível, labels acima dos campos.

## Convenções
- Código e nomes técnicos em inglês; textos da interface em português.
- Commits: `feat:`, `fix:`, `chore:`, `refactor:`.
- Antes de concluir uma tarefa: `pnpm lint` e `pnpm build` sem erros.
- Mensagens de erro ao usuário: dizer o que aconteceu e como resolver.

## Comandos
- `pnpm dev` — rodar o app web
- `pnpm build` — build de todos os pacotes
- `pnpm lint` — lint
- `npx supabase gen types typescript --linked > packages/types/src/database.ts` — tipos do banco
