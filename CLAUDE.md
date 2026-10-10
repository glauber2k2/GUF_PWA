# Guf App — Contexto do projeto

App PWA de evolução fitness (musculação). Interface em **português do Brasil**. Mobile first.
Usuário registra treinos NA ACADEMIA, com uma mão, entre séries: registrar uma série deve levar menos de 3 segundos.
Nome da marca: **guf** (Guf App) — nunca "guff" (o design system do Claude Design ainda usa "guff" em alguns nomes; corrigir ao implementar).

## Funcionalidades do MVP
- Autenticação: e-mail/senha e Google, com vinculação do Google a conta existente (feita pelo Supabase quando o e-mail confirmado é o mesmo). Login com Apple fica para a fase do app iOS.
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
- Animações: Anime.js (v4), React Bits, Motion — sempre respeitando prefers-reduced-motion. Ainda não instaladas: por enquanto as animações são keyframes CSS do design system.
- PWA: Serwist · Offline do treino em andamento: Dexie (IndexedDB)
- Hospedagem: testes na **Vercel** (atual). Produção: **Cloudflare Pages** ou plano pago da Vercel, antes de monetizar. Em todos os casos, site estático.
- Futuro: app React Native (Expo) reaproveitando os pacotes compartilhados
- Não adicionar bibliotecas fora desta lista sem perguntar.

## Estrutura
```
guf-app/
├── apps/web/            # Next.js PWA
├── packages/core/       # regras de negócio puras (1RM, volume, PR, formatações, datas) — sem React
├── packages/schemas/    # schemas Zod compartilhados
├── packages/api/        # cliente Supabase + funções de consulta (usadas por web e mobile)
├── packages/types/      # tipos gerados do banco (src/database.ts)
├── supabase/            # migrations, seed e Edge Functions (backend JÁ PRONTO)
└── design/              # referências exportadas do Claude Design
```

## Regras de arquitetura (OBRIGATÓRIAS)
1. **Site estático:** `output: "export"` no Next.js. NÃO usar Server Actions, Route Handlers, middleware de servidor ou SSR com dados. Tudo roda no cliente.
2. **Rotas dinâmicas:** evitar `/treino/[id]`. Usar rotas fixas com query string (`/treino?id=...`) lidas com `useSearchParams` (envolver em `<Suspense>`).
3. **Segurança no banco:** o RLS do Supabase protege os dados. No front, usar APENAS a chave pública `publishable` (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). NUNCA usar `service_role`/`secret` no front. Cliente: `createGufClient` (packages/api, PKCE + sessão persistente) via `getSupabaseClient()` em apps/web/src/lib/supabase.ts. `NEXT_PUBLIC_SUPABASE_URL` é só a URL base do projeto (`https://<ref>.supabase.co`, sem `/rest/v1`).
4. **Lógica reutilizável fora do app web:** cálculos em `packages/core`, validações em `packages/schemas`, consultas em `packages/api`. Componentes React ficam em `apps/web`.
5. **Não alterar o banco pelo front nem pelo painel.** Mudanças de schema só via nova migration em `supabase/migrations/` (`npx supabase migration new nome`). Não editar migrations já existentes.
6. **Tipos do banco:** importar de `packages/types/src/database.ts`. Regenerar com `npx supabase gen types typescript --linked > packages/types/src/database.ts` após qualquer migration (gerar antes num arquivo temporário para não truncar o atual se o comando falhar).

## Padrões do front (apps/web)
- **Estilo:** classes utilitárias do Tailwind usando os tokens do `@theme` (ex.: `bg-surface`, `text-fg`, `rounded-lg`). Sem estilos inline (`style={{…}}`), exceto valores realmente dinâmicos (ex.: % de uma barra de progresso, atraso escalonado de animação). Sem CSS por componente. O CSS global fica só para tokens, reset, fontes e keyframes (`src/styles/tokens/` + `src/app/globals.css`).
- **Cores de texto:** `text-fg`, `text-fg-secondary`, `text-fg-muted`. Atenção: `text-primary` é o volt (alias do shadcn), não a cor do texto. Misturas de cor (`color-mix`) viram tokens nomeados no `@theme`, nunca classes arbitrárias com `var()`.
- **Componentes:** reutilizar os de `apps/web/src/components/ds/` antes de criar novos; componente novo só se não existir. Componentes de uma tela ficam em `src/components/<tela>/`.
- **Fontes:** Inter (interface) e Barlow Condensed (números, sempre `tabular-nums`), locais via `next/font/local` em `src/app/fonts/`.
- **Dados fictícios:** sempre em `apps/web/src/mocks/`, com a **mesma assinatura** das funções reais de `packages/api` (mesmos nomes, parâmetros e retorno, inclusive erros), validada com `satisfies <Contrato>Api`. Integrar = trocar a importação.
- **Contrato das funções de `packages/api`:** `(client, input) => Promise<{ data, error }>` (nunca os dois); `error` = `{ code, message }` com mensagem pronta em português (o que aconteceu e como resolver).
- **Só em desenvolvimento:** páginas com extensão `.dev.tsx` (ex.: `/design-system`, reconhecidas só no `next dev` via `pageExtensions`) e parâmetros de teste como `?estado=` (protegidos por `process.env.NODE_ENV === "development"`, eliminados do build de produção).
- **Rotas e proteção (no cliente; quem protege os dados é o RLS):** grupo `(app)` exige sessão e aceite (`RequireAuth` + `AppShell` com menu inferior); `(auth)` = /login e /cadastro (logado segue para o app); `(consent)` = /aceite. `?next=` só aceita caminhos internos (`safeNextPath`).
- **Datas:** sempre no fuso local do aparelho (`packages/core/src/dates.ts`); semana de segunda a domingo.

## Backend (Supabase) — já implementado
Tabelas: profiles, exercises, projects, routines, routine_exercises, workout_sessions, session_exercises, set_logs, body_measurements, measurement_values, legal_documents, consent_records, entitlements.

Preenchidos por gatilho (NÃO enviar): `user_id` em routine_exercises, session_exercises e measurement_values; `user_id`, `session_id`, `exercise_id` e `completed_at` em set_logs. (Os tipos gerados marcam esses `user_id` como obrigatórios por serem NOT NULL; omitir e fazer conversão de tipo explícita com comentário.) `workout_sessions.user_id` NÃO tem gatilho: enviar o id do usuário logado. Perfil e plano são criados automaticamente no cadastro.

**Cadastro por e-mail:** os ids das versões vigentes de terms, privacy e age_declaration exibidas na tela vão em `options.data.accepted_document_ids` no `signUp` (com `emailRedirectTo` = origem atual do app e `signup_platform`), e o gatilho `handle_new_user` registra os aceites (`source 'signup_email'`, só versões vigentes; ids inválidos são ignorados e o portão /aceite cobre o que faltar). NÃO chamar `accept_documents` no signUp (sem sessão quando a confirmação de e-mail está ligada).

Funções RPC:
| Função | Uso |
|---|---|
| `pending_documents()` | Portão /aceite (termos, privacidade, idade pendentes) |
| `accept_documents(p_document_ids, p_source, p_platform)` | Registrar aceite (só versões vigentes; versão desatualizada → erro 22023) |
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
- **Um treino em andamento por vez** (o banco recusa outro): ao abrir o app, retomar o treino aberto. Com treino aberto, a aba "Treinar" e a folha "Iniciar treino" oferecem só retomar.
- **Iniciar treino:** cria a sessão (nome da rotina como snapshot ou "Treino livre") e copia os exercícios planejados para session_exercises; se a cópia falhar, apaga a sessão recém-criada.
- **Um projeto ativo por usuário:** desativar o atual antes de ativar outro.
- **Trocar exercício de um treino:** apagar o session_exercise e criar outro.
- **Rotina sugerida para hoje:** a próxima do projeto ativo depois da última concluída, seguindo `position`, voltando para a primeira depois da última. Sem histórico → a primeira.
- **Card "Treino de hoje" (prioridade):** em andamento > concluído hoje > rotina sugerida > sem plano (tem rotinas, sem projeto ativo) > usuário novo (nenhuma rotina).
- **Streak:** semana (seg–dom) conta com ≥ 1 treino concluído; semana inteira sem treino zera. `weekly_goal` é só para exibição.
- **Textos do card de sequência:** número + "semanas" com "seguidas treinando" abaixo (lê-se "semanas seguidas treinando"); `week_secured` → "Semana garantida ✓" (o ✓ é o ícone Check do lucide) + "X de Y treinos da sua meta" quando houver meta; `streak_at_risk` → "Nenhum treino nesta semana ainda. Treine até domingo para manter sua sequência."; zerada ou usuário novo → "Treine 1 vez até domingo e comece sua sequência."; destaque dourado de recorde quando `current_streak` = `best_streak` e > 0.
- **Resumo de um treino:** volume = Σ carga × reps das séries concluídas sem aquecimento (mesma regra de `get_training_days`); "Séries" = séries concluídas sem aquecimento. Duração estimada da rotina = Σ séries × (40s + descanso), com padrão de 3 séries e 90s.
- **1RM estimado:** Epley — carga × (1 + reps / 30). Aquecimentos não contam.
- **Primeira vez de um exercício não gera PR.**
- **Senha do cadastro:** mínimo de 8 caracteres.

## LGPD (não negociável)
- Cadastro: checkbox "Tenho 18 anos ou mais" + checkbox "Li e aceito os Termos de Uso e a Política de Privacidade", ambas desmarcadas; botão desabilitado até marcar.
- Login com Google: após o primeiro acesso, se `pending_documents()` retornar algo → redirecionar para /aceite antes de liberar o app.
- Portão /aceite: lista os documentos pendentes; mostra só as confirmações do que está pendente ("Tenho 18 anos ou mais" para age_declaration; a de Termos/Privacidade para terms ou privacy), sempre desmarcadas; botão só habilita com todas marcadas; botão "Sair" com o mesmo peso. `source` do aceite: `reaccept` se já houver aceite anterior; senão `signup_google` (entrou com Google) ou `signup_email`.
- Consentimento de saúde em camadas: resumo SEMPRE visível (5 itens) + "Ler termo completo" expansível + checkbox desmarcada + botões "Agora não" e "Autorizar e continuar" com o MESMO peso visual.
- Nunca enviar dados de medidas para logs, Sentry ou analytics.

## Autenticação (implementação)
- Google com PKCE: `redirectTo` = `<origem atual>/login?next=<destino validado>`; o código é trocado ao carregar a página. Erros de retorno (`?error=…` ou falha na troca do código) viram mensagem em português na tela de login (`oauthReturnError` em packages/api).
- No painel do Supabase, Redirect URLs com curinga: `http://localhost:3000/**` e `https://<domínio>/**`.

## Design
- Seguir o design system do Guf (Claude Design) e as referências em `design/`.
- Verde volt `#C6F432` = ação, seleção e conquista. Texto escuro sobre volt. No tema claro, textos/ícones usam verde mais escuro (contraste AA).
- Tema escuro padrão (`#0B0D10`, superfícies `#14171C` / `#1C2027`); tema claro equivalente (`#F6F7F9`). Cores sempre como tokens (variáveis CSS), nunca soltas.
- Toques ≥ 44px; ações de treino ≥ 56px; ação principal na zona do polegar.
- Bottom navigation: Início, Histórico, Treinar (central), Projetos, Perfil.
- Acessibilidade WCAG AA, foco visível, labels acima dos campos.
- Sem emoji nem caractere unicode como ícone: usar ícones do lucide-react.
- Ao implementar um design: a moldura de celular, a barra de status e o indicador de home do Claude Design são só apresentação e não entram no app.

## Convenções
- Código e nomes técnicos em inglês; textos da interface em português.
- Commits: `feat:`, `fix:`, `chore:`, `refactor:`.
- Git: cada funcionalidade em sua própria branch (criada a partir da branch da etapa anterior); commit e push só quando pedido; nunca commitar `.env.local`.
- Antes de concluir uma tarefa: `pnpm lint` e `pnpm build` sem erros.
- Sempre encerrar o servidor de desenvolvimento que você iniciar ao terminar os testes.
- Mensagens de erro ao usuário: dizer o que aconteceu e como resolver.
- Ao mudar `compilerOptions` do apps/web, apagar `apps/web/tsconfig.tsbuildinfo` e `apps/web/.next/cache/.tsbuildinfo` (cache incremental guarda erros antigos).

## Comandos
- `pnpm dev` — rodar o app web
- `pnpm build` — build de todos os pacotes
- `pnpm lint` — lint
- `pnpm typecheck` — checagem de tipos
- `npx supabase gen types typescript --linked > packages/types/src/database.ts` — tipos do banco
