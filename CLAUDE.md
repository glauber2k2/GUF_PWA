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
- Gráficos: Recharts (instalado no apps/web; cores via `var(--color-…)` dos tokens) · Datas: date-fns (só em packages/core; o app usa as funções de `dates.ts`) · Ícones: lucide-react
- Animações: Anime.js (v4), React Bits, Motion — sempre respeitando prefers-reduced-motion. **Motion instalado** (`motion@13.4.6`, `motion/react`): `MotionProvider` nos Providers (`LazyMotion` domMax `strict` → usar `m.*`, nunca `motion.*`; `MotionConfig reducedMotion="user"`). Primitivas em `components/ds/motion.tsx`: `Collapse` (abrir/fechar com altura), `PresenceRow` (linha que entra/sai), `LayoutItem` + `LAYOUT_ITEM_PROPS` (desliza ao reordenar/remover; dentro de `AnimatePresence initial={false} mode="popLayout"`, contêiner `relative`). Entradas simples continuam nos keyframes CSS (`animate-guf-*`). Motion vai num invólucro, nunca no mesmo elemento de um keyframe com `transform` (a animação CSS sobrescreve o transform do Motion). Anime.js e React Bits ainda não instalados.
- Sons: registry **soundcn** pela CLI do shadcn (`pnpm dlx shadcn add @soundcn/<som>`; som em base64 no próprio arquivo, funciona offline; motor em `src/lib/sound-engine.ts`). Usar só sons CC0 de origem conhecida (ex.: Kenney).
- PWA: Serwist (`@serwist/cli` + `serwist`; o `esbuild` é dependência obrigatória do CLI, só no build) · Offline do treino em andamento: Dexie (IndexedDB)
- Imagens dos stories: `modern-screenshot` (4.7.0; elemento → PNG no aparelho, embute fontes; aprovada em 2026-10-16)
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
├── design/              # (prevista, ainda não criada) referências exportadas do Claude Design
└── docs/                # plano de implementação e regras de negócio (manter atualizados a cada etapa)
```

## Regras de arquitetura (OBRIGATÓRIAS)
1. **Site estático:** `output: "export"` no Next.js. NÃO usar Server Actions, Route Handlers, middleware de servidor ou SSR com dados. Tudo roda no cliente.
2. **Rotas dinâmicas:** evitar `/treino/[id]`. Usar rotas fixas com query string (`/treino?id=...`) lidas com `useSearchParams` (envolver em `<Suspense>`).
3. **Segurança no banco:** o RLS do Supabase protege os dados. No front, usar APENAS a chave pública `publishable` (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). NUNCA usar `service_role`/`secret` no front. Cliente: `createGufClient` (packages/api, PKCE + sessão persistente) via `getSupabaseClient()` em apps/web/src/lib/supabase.ts. `NEXT_PUBLIC_SUPABASE_URL` é só a URL base do projeto (`https://<ref>.supabase.co`, sem `/rest/v1`).
4. **Lógica reutilizável fora do app web:** cálculos em `packages/core`, validações em `packages/schemas`, consultas em `packages/api`. Componentes React ficam em `apps/web`.
5. **Não alterar o banco pelo front nem pelo painel.** Mudanças de schema só via nova migration em `supabase/migrations/` (`npx supabase migration new nome`). Não editar migrations já existentes.
6. **Tipos do banco:** importar de `packages/types/src/database.ts`. Regenerar com `npx supabase gen types typescript --linked > packages/types/src/database.ts` após qualquer migration (gerar antes num arquivo temporário para não truncar o atual se o comando falhar). No Windows PowerShell 5.1, o `>` grava em UTF-16: converter para UTF-8 antes de substituir o `database.ts` (ou gerar pelo Git Bash). Nesta versão da CLI o `gen types` pode não achar o login que os outros comandos acham; nesse caso, rodar no terminal do usuário.

## Padrões do front (apps/web)
- **Estilo:** classes utilitárias do Tailwind usando os tokens do `@theme` (ex.: `bg-surface`, `text-fg`, `rounded-lg`). Sem estilos inline (`style={{…}}`), exceto valores realmente dinâmicos (ex.: % de uma barra de progresso, atraso escalonado de animação). Sem CSS por componente. O CSS global fica só para tokens, reset, fontes e keyframes (`src/styles/tokens/` + `src/app/globals.css`).
- **Cores de texto:** `text-fg`, `text-fg-secondary`, `text-fg-muted`. Atenção: `text-primary` é o volt (alias do shadcn), não a cor do texto. Misturas de cor (`color-mix`) viram tokens nomeados no `@theme`, nunca classes arbitrárias com `var()`.
- **Componentes:** reutilizar os de `apps/web/src/components/ds/` antes de criar novos; componente novo só se não existir. Componentes de uma tela ficam em `src/components/<tela>/`.
- **Reordenar listas:** usar o hook `usePointerReorder` (`apps/web/src/hooks/`; toque, mouse e setas do teclado; destino pelas posições medidas no início do arraste) + positions sequenciais (`changedPositions` em packages/core). No treino em andamento: `useHoldReorder` (segurar o card). O `ReorderList` do design system usa o arrastar nativo do HTML5, que não funciona no toque do celular — não usar em telas do app.
- **Camadas fixas na tela** (folhas `BottomSheet`/`ConfirmDialog` com `placement="screen"`, seletor de exercícios e qualquer tela cheia nova): renderizar por portal no `<body>` (`ScreenPortal` do design system). Um ancestral com `transform` (ex.: a animação de entrada `animate-guf-rise`) vira a referência do `position: fixed` e a camada "escondida" aparece no meio da página. Camadas: folhas `z-[60]`, diálogos `z-[70]` (acima de telas cheias `z-50`).
- **Fechar o `BottomSheet`:** toque fora, Esc ou arrastar para baixo pela alça/título (`useSheetDrag` em apps/web/src/hooks; fecha ao soltar com > 30% da altura ou gesto rápido, senão volta). Só a área do topo arrasta, para não brigar com campos e rolagem do conteúdo. Sem `onClose`, a folha não fecha por nenhum desses meios. O `ConfirmDialog` ainda NÃO fecha com Esc nem prende o foco (pendência de acessibilidade).
- **Toques repetidos que gravam** (ex.: + / − da meta semanal): `useCoalescedSave` (apps/web/src/hooks; lógica pura `createCoalescedSaver` em packages/core/src/coalesce.ts). A tela muda na hora e só o último valor é enviado 600 ms depois do último toque; nunca duas gravações ao mesmo tempo; voltar ao valor salvo não envia; ao sair da tela, envia o que estiver esperando.
- **Toast** (protótipo `Toast.dc.html` do Claude Design): `const id = useAppShell().showToast(título, { tone, message, icon, actionLabel, onAction, onClose, haptic })`. Tipos (`tone`, sempre informar): `success` · `error` (role alert) · `warning` · `info` · `pr` (troféu, brilho dourado) · `undo` ("Desfazer"; ação em volt) · `loading` (GufLoader 04, não expira; trocar com `updateToast(id, título, opções)`); `dismissToast(id)`. O tipo é lido pelo ícone, cor e título, nunca só pela cor; mensagem longa vai em `message`. Pilha (`ToastStack` + `createToastStore` em `src/lib/toast/toast-store.ts`): 5 s com barra de tempo, até 3 visíveis, mouse/foco/toque expande e pausa, arrastar para o lado (> 90 px) dispensa; portal no `<body>` em `z-[65]`. `onClose` = sumiu SEM a ação (use para confirmar remoções adiadas). Vibra em sucesso/recorde (`haptic: false` quando a tela já vibrou). Tela com barra fixa no rodapé chama `useRaisedToast(ativo)` (contador; vale também nas telas imersivas). Toast fixo fora da pilha (ex.: nova versão do PWA): componente `Toast` direto.
- **Fontes:** Inter (interface) e Barlow Condensed (números, sempre `tabular-nums`), locais via `next/font/local` em `src/app/fonts/`.
- **Dados fictícios:** sempre em `apps/web/src/mocks/`, com a **mesma assinatura** das funções reais de `packages/api` (mesmos nomes, parâmetros e retorno, inclusive erros), validada com `satisfies <Contrato>Api`. Integrar = trocar a importação.
- **Contrato das funções de `packages/api`:** `(client, input) => Promise<{ data, error }>` (nunca os dois); `error` = `{ code, message }` com mensagem pronta em português (o que aconteceu e como resolver).
- **Só em desenvolvimento:** páginas com extensão `.dev.tsx` (ex.: `/design-system`, reconhecidas só no `next dev` via `pageExtensions`) e parâmetros de teste como `?estado=` (protegidos por `process.env.NODE_ENV === "development"`, eliminados do build de produção).
- **Rotas e proteção (no cliente; quem protege os dados é o RLS):** grupo `(app)` exige sessão e aceite (`RequireAuth` + `AppShell` com menu inferior); `(auth)` = /login e /cadastro (logado segue para o app); `(consent)` = /aceite. `?next=` só aceita caminhos internos (`safeNextPath`).
- **Datas:** sempre no fuso local do aparelho (`packages/core/src/dates.ts`); semana de segunda a domingo.
- **Erros da API:** códigos e mensagens em `packages/api/src/result.ts` (`toApiError`): `workout_in_progress` (23505), `workout_not_found` (P0002), `project_not_found` (GP001), `project_locked` (GP002, Favoritos), `routine_empty` (GP003), `routine_not_found` (GP004), `session_not_found` (treino concluído inexistente ou excluído), `exercise_not_found`, `not_authenticated`, `network_error`, `unknown`.

## Treino em andamento (offline-first)
- **Escrita sempre pela fila** (`apps/web/src/lib/offline/`, Dexie): a tela altera o estado local na hora e enfileira a operação com `enqueue(op)`; `flushOutbox()` envia em ordem quando há internet (eventos online/visibilidade + intervalo de 20s). Nunca chamar as funções de escrita da API direto da tela, exceto `finishWorkout` online.
- **Idempotência:** ids de exercícios do treino, séries e exercícios criados são gerados no aparelho (`crypto.randomUUID()`) e gravados com upsert; reenviar a mesma operação não duplica.
- **Fila:** para em `network_error`/`not_authenticated` e tenta de novo depois; outros erros tentam até 5 vezes e a operação é descartada com aviso. Descartar o treino remove as operações pendentes dele.
- **Leitura:** `loadWorkout` usa a cópia do aparelho enquanto houver operações pendentes daquele treino; senão, a rede (atualizando a cópia); sem internet, a cópia. A tela salva um retrato do treino a cada alteração.
- **Finalizar:** online e sem pendências → `finish_workout` (resumo e recordes oficiais); sem internet → enfileira `finish` e mostra o resumo calculado no aparelho (mesmas regras) com aviso de envio pendente.
- **Sair da conta:** tenta enviar a fila antes; depois limpa cache do TanStack Query, treino ativo (localStorage) e dados offline (IndexedDB).
- **Não funciona offline:** iniciar treino (a sessão é criada no servidor).
- **Finalizar automaticamente (servidor):** opção do Perfil `profiles.auto_finish_workout` (desligada por padrão; só online). O job pg_cron `auto-finish-idle-workouts` (a cada 5 min) chama `auto_finish_idle_workouts()` (sem acesso pelo app): treino em andamento com ≥ 1 série, TODAS concluídas e a última concluída há ≥ 30 min → `completed` com `finished_at` = horário da última série (períodos ativos cortados nele; exercícios sem séries saem). Recordes não são gravados (o resumo calcula). `completed_at` vem do gatilho (hora em que a série chegou ao servidor; série concluída offline conta a partir do envio). 
- **Treino encerrado fora do app:** o banco NÃO bloqueia gravações em treino concluído (haverá edição de treino no futuro); quem garante o encerramento é o app. `workout_sessions.auto_finished` marca o encerrado pela finalização automática. (1) A fila (`outbox.ts`), antes de enviar a 1ª gravação de cada treino em cada envio, consulta `getWorkoutStatus`: não está `in_progress` → NADA dele é enviado (alterações feitas depois do encerramento, ex.: sem internet, não entram), `dropWorkoutLocally` descarta fila e retrato e `onWorkoutClosedOnServer` avisa (`ServerClosedWorkout`: status, autoFinished, droppedChanges). (2) O `AppShell` usa `useClosedWorkoutWatcher` (checa a cada 60 s com o app visível e ao voltar para o app): encerrado → limpa o treino ativo e o mini card, toast "Treino encerrado automaticamente" (ou "finalizado em outro aparelho"; "As alterações feitas depois disso não foram salvas." quando algo foi descartado) e, na tela do treino, vai para o resumo. "Finalizar" que encontra o treino encerrado usa `useAppShell().resolveClosedWorkout`.
- **Mini card / aba Treinar:** o `AppShell` acompanha `inProgress` do banco (sem redirecionar; a Início mostra o card em destaque) e some o mini card quando o banco não tem treino aberto e não há nada pendente no aparelho.
- **Reordenar exercícios do treino:** segurar o cabeçalho de um card (~0,45 s, vibra) liga o modo de reordenar: o MESMO card fica compacto (só cabeçalho, altura fixa `REORDER_CARD_PX`) e balança (`animate-guf-wiggle`, parado em movimento reduzido), e o gesto já arrasta o card segurado. Soltar salva a nova ordem e sai do modo; Esc ou cancelamento do gesto sai sem gravar. Hook `useHoldReorder` (apps/web/src/hooks): destino por slot fixo a partir do topo da lista (nunca medir itens no meio da animação), card arrastado anda com o dedo (`translate`), rolagem automática perto das bordas, `touchmove` não passivo só durante o arraste. O card inteiro impede seleção, menu de copiar e arraste nativo de texto mesmo aberto; o hook limpa seleção anterior ao começar e bloqueia essas ações na janela enquanto arrasta. Não trocar o card por outro componente ao entrar no modo: no toque, o resto do gesto vai para o elemento tocado e, se ele sair da página, o arraste se perde. A ordem vai pela fila (`reorderExercises` → `reorderWorkoutExercises`: position = índice; reenviar não muda nada). O cabeçalho inteiro do card abre/recolhe as séries (não só a seta).
- **Demonstração (só dev):** `/treino?id=demo&estado=demo` usa o mock e não grava nada.

## Projetos (/projetos e /projetos/detalhe?id=…)
- **Dados:** `packages/api/src/projects.ts` (`ProjectsApi`): visão geral (projetos com rotinas em uso e último treino concluído) e gravações de projetos e rotinas. Regras puras em `packages/core/src/projects.ts`; validação em `packages/schemas/src/projects.ts`.
- **Só online:** sem fila offline; `useCanEditPlanning()` bloqueia as ações sem internet e o banner "Sem conexão – para criar ou editar rotinas, conecte-se à internet." aparece; formulários mantêm o que foi digitado e oferecem "Tentar de novo" (`save-state.tsx`).
- **Ações** (`use-project-actions.ts`): ativar (RPC `activate_project`), desativar, arquivar (também desativa), restaurar, arquivar rotina e reordenar — cada uma com toast e "Desfazer"; excluir projeto (menu do projeto e lista de arquivados) pede confirmação e não tem "Desfazer". Após gravar: `invalidatePlanningData` (Projetos + Início).
- **Menus, folhas e confirmações** ficam em `project-flows.tsx` (usado pela lista e pelo detalhe).
- **Estados de desenvolvimento:** `?estado=` padrao · nenhum-ativo · novo · sem-rotinas · erro · carregando · offline · queda (gravações falham como queda de conexão).
- **Favoritos:** projeto padrão de todo usuário (`projects.is_favorites`), criado no cadastro (`handle_new_user`; ativo para usuário novo). Não existe rotina avulsa: rotinas sem outro projeto ficam nele. O banco recusa renomear, arquivar, excluir ou criar outro pelo app (gatilho `protect_favorites_project`, erro GP002); o app esconde essas opções. A exclusão da conta apaga tudo normalmente.

## Rotina (/rotina?id=… para editar · /rotina?projeto=… para nova)
- **Tela imersiva** (sem menu inferior): nome, projeto, dias da semana, exercícios planejados (séries 1–20, repetições alvo em texto livre até 20 caracteres, descanso 45 s/1:00/1:30/2:00/3:00, observação), trocar (mantém séries, repetições, descanso e observação), remover (com "Desfazer") e reordenar (`usePointerReorder`).
- **Rascunho + "Salvar":** as mudanças ficam na tela (`routine-draft.ts`) e são gravadas de uma vez pela RPC `save_routine` (transação: nome, projeto, dias e exercícios; ids dos exercícios gerados no app; os que saíram da lista são apagados). Enquanto grava, o `SavingOverlay` "Salvando rotina" (loading 02) bloqueia a tela; salvou → volta para o detalhe do projeto da rotina com o toast "Rotina salva"/"Rotina criada". Sair com mudanças pede confirmação.
- **Validação** (`routineDraftSchema` em packages/schemas): nome obrigatório e pelo menos 1 exercício com repetições. Exercício novo: 3 × 10, descanso 90 s.
- Exercícios criados no seletor entram pela fila offline: `flushOutbox()` antes de salvar a rotina.
- Só online (mesma regra de Projetos). Estados de desenvolvimento: os mesmos `?estado=` de Projetos (mock compartilha a memória).
- **Atalhos:** "Criar minha primeira rotina" (Início) e "Montar uma rotina" (folha Iniciar treino) abrem `/rotina?projeto=<projeto ativo>` (`newRoutinePathFor`); sem projeto ativo, a lista de Projetos.

## PWA (instalável e abre offline)
- **Service worker** gerado DEPOIS do `next build`: `apps/web` → `"build": "next build && serwist build serwist.config.mjs"`. O `serwist build` empacota `apps/web/sw/sw.ts` (esbuild) e injeta o pré-cache de `out/` em `out/sw.js`. Sem Route Handler nem servidor (o pacote `@serwist/turbopack` exige Route Handler — não usar).
- **`sw/sw.ts`** tem tsconfig próprio (lib webworker) e fica fora do tsconfig do app; o `pnpm typecheck` do web checa os dois.
- **Pré-cache:** HTML, payloads `.txt` da navegação, JS, CSS, fontes e ícones (sem `.map`). Rotas com query string usam o mesmo HTML (`ignoreURLParametersMatching`). **Nunca** cachear respostas do Supabase no service worker (dados do usuário ficam só no Dexie/TanStack).
- **Registro e atualização:** `ServiceWorkerUpdater` (layout raiz) chama `initPwa()` de `src/lib/pwa/pwa-store.ts`: guarda o convite `beforeinstallprompt`, acompanha o modo instalado e registra `/sw.js` (só no build de produção); versão nova espera e mostra "Nova versão do guf disponível · Atualizar" (`applyUpdate` → `SKIP_WAITING`); só recarrega quando o usuário toca. O Perfil usa o mesmo estado (`usePwaState`, `useInstallPlatform`, `promptInstall`).
- **Manifesto:** `src/app/manifest.ts` (estático → `/manifest.webmanifest`): standalone, retrato, cores ink-950. Ícones: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`; `src/app/icon.svg` (favicon) e `src/app/apple-icon.png` (iPhone). Não definir `icons` no `metadata` (desliga os ícones por arquivo).
- **No iPhone:** instalar por Safari → Compartilhar → "Adicionar à Tela de Início" (o iOS não mostra convite automático).

## Perfil (/perfil)
- **Dados:** `packages/api/src/profile.ts` (`ProfileApi`): `getProfile` (perfil + e-mail da sessão + 1º treino e total de concluídos), `updateProfile` (nome, unidade, meta, finalizar treino automaticamente), `getConsents` (último aceite de cada documento; saúde só se `has_health_consent`), `revokeHealthConsent`, `exportMyData`, `deleteAccount` (Edge Function). Regras puras em `packages/core/src/profile.ts` e `pwa.ts` (`installPlatform`); validação em `packages/schemas/src/profile.ts`.
- **Só online:** nome, unidade, meta, finalizar treino automaticamente, exportar, revogar e excluir (`useCanEditProfile`); banner "Sem conexão – para alterar seu perfil, conecte-se à internet." Instalar, tema, fim do descanso, tela ligada e sair funcionam offline. Alterações usam atualização otimista e `invalidateProfileData` (Perfil + Início + Histórico).
- **Fim do descanso:** `src/lib/rest-alert/rest-alert.ts` — preferência no aparelho (`localStorage` "guf.rest-alert": sound · silent; padrão sound). Som = efeito `power-up-7`. Sem opção de vibrar (removida: não funcionava de forma confiável no Android e o iPhone não tem a API); valor antigo "vibrate" salvo no aparelho volta para o padrão. O `WorkoutProvider` chama `primeRestAlert()` no toque que inicia o descanso (libera o áudio no iPhone) e `playRestAlert()` quando ele termina sozinho; escolher no Perfil toca uma prévia. Só toca com o app aberto.
- **Tela ligada no treino:** `useScreenWakeLock` (apps/web/src/hooks/use-screen-wake-lock.ts, Screen Wake Lock API) no `WorkoutProvider` enquanto houver treino em andamento; pede de novo ao voltar para o app. Opção "Manter tela ligada no treino" no Perfil (`localStorage` "guf.keep-screen-on": on · off; padrão on). Sem suporte, segue normal. Preferências do aparelho (exceto o tema) usam `createDevicePreference` (src/lib/device-preference.ts).
- **Tema:** `src/lib/theme/theme.ts` — preferência no aparelho (`localStorage` "guf.theme": dark · light · system), aplicada antes da pintura por `THEME_BOOT_SCRIPT` no `<head>` (`<html suppressHydrationWarning>`), inclusive a meta theme-color.
- **Exportar:** JSON gerado no aparelho (Blob) com nome `guf-meus-dados-AAAA-MM-DD.json` e "Baixar"; o conteúdo nunca vai para logs.
- **Excluir conta:** digitar EXCLUIR → `deleteAccount` → `signOut` (sem enviar a fila offline) → `/login/?conta-excluida=1` ("Sua conta foi excluída."). O mock só simula.
- **Confirmações LGPD** (revogar consentimento; sair com gravações pendentes): `ConfirmDialog` com `balanced` (os dois botões com o mesmo peso).
- **Versão:** `NEXT_PUBLIC_APP_VERSION` = `version` do `apps/web/package.json` (definida no `next.config.ts`).
- **Estados de desenvolvimento:** `/perfil?estado=` padrao · sem-saude · erro · carregando · offline · pendente · foto + plataforma android · ios-safari · ios-outro · instalado · desconhecido (combináveis).
- A Início abre o Perfil pelo avatar (não há mais a folha "Sua conta").
- **Foto do usuário:** componente `Avatar` do design system (inicial por baixo; volta para a inicial se a foto falhar). Prioridade em `packages/core/src/avatar.ts` (`pickAvatar`) e URL final em `resolveAvatarUrl` (packages/api/src/shared.ts), usada por `getProfile` e `getHomeSummary`: **foto enviada** pelo usuário > foto atual da conta Google (metadados/identidades da sessão; cobre conta de e-mail vinculada depois) > foto do cadastro (`profiles.avatar_url`) > inicial. Convenção de `profiles.avatar_url`: URL http(s) = foto social; caminho sem protocolo (`<user_id>/arquivo`) = foto enviada, no bucket `avatars` do Storage. O upload ainda não existe: chega com uma migration (bucket + políticas) que grava o caminho em `profiles.avatar_url`. `?estado=foto` mostra uma foto fictícia.

## Histórico (/historico)
- **Dados:** `packages/api/src/history.ts` — `getHistoryOverview` (dias treinados das últimas 104 semanas + `get_streak()` + meta + unidade + data do 1º treino), `getTrainingDays` (mês do calendário) e `getDaySessions` (treinos do dia, com recordes). Mapeadores comuns com a Início em `packages/api/src/shared.ts`.
- **Regras puras:** `packages/core/src/history.ts` (grade do mês, tercis de volume, médias semanais, comparação de períodos, faixa de semanas, recorde de treino passado).
- **Sequência:** números SEMPRE do `get_streak()` (nunca recalcular no app). Faixa das últimas 12 semanas: preenchida se a semana teve ≥ 1 treino concluído; a semana atual sem treino fica "em risco" até domingo.
- **Calendário:** semana seg–dom, do mês do 1º treino até o mês atual; 3 níveis de realce pelos tercis de volume das últimas 12 semanas (tokens `volume-1`, `volume-2`, `accent`); só dias treinados são tocáveis (abrem a folha do dia).
- **Gráfico:** "Volume médio por dia treinado" por semana (4 sem · 3 meses · 6 meses · 1 ano); média = dias treinados com volume > 0 (dia só de cardio conta como treino, não entra na média); semana sem treino é lacuna, nunca zero; média do período = média das semanas com treino; variação % vs. período anterior (alta em volt, queda em cor neutra). Menos de 2 semanas com volume → aviso "poucos dados".
- **Recordes do dia:** mesma regra do `finish_workout` — carga máxima do treino maior que a de todos os treinos concluídos ANTES dele (dias anteriores e, no mesmo dia, os que terminaram antes); primeira vez não gera recorde. Calculado com `get_exercise_history` dos exercícios do dia, só ao abrir a folha.
- **URL:** `?mes=2026-10&periodo=3m` (mês futuro ou inválido → mês atual).
- **Offline:** `withDeviceCache` (`apps/web/src/lib/offline/device-cache.ts`, tabela `history` do Dexie) guarda a última resposta e mostra o banner "Sem conexão – mostrando o último histórico salvo".
- **Atualização:** finalizar/descartar treino chama `invalidateTrainingData` (`apps/web/src/lib/query-keys.ts`) → Início e Histórico recarregam; o mesmo acontece quando a fila offline envia um treino finalizado sem internet.
- **Estados de desenvolvimento:** `/historico?estado=` padrao · risco · recorde · novo · poucos · erro · carregando · offline · dia (combináveis).

## Resumo do treino (/treino/resumo?id=…) e Evolução (/exercicio?id=…&metrica=…&periodo=…, /exercicio/busca)
- **Dados:** `packages/api/src/evolution.ts` (`EvolutionApi`): `getWorkoutSummary` (só séries concluídas; recordes com `sessionLoadRecord`, como na folha do dia), `deleteWorkout` (só `status = 'completed'`; cascade de exercícios, séries e períodos), `getExerciseEvolution` (números do `get_exercise_history` + séries para as reps da melhor série e a série do 1RM) e `listTrainedExercises`. Regras puras em `packages/core/src/evolution.ts` (recordes por métrica, séries do gráfico, tendência, variação, textos).
- **Telas imersivas** (sem menu inferior; `IMMERSIVE_ROUTES` no AppShell) com `DetailHeader` e `useGoBack` (sem histórico de navegação → /historico). Links: `summaryPath`, `exercisePath`, `exerciseSearchPath` (`components/evolution/paths.ts`; em dev levam o `?estado=` junto).
- **Vários treinos no dia:** `getWorkoutSummary` devolve `daySessionIds` (ordem de término); o `DetailHeader` mostra `position` ("1/2") só com 2 ou mais; a Início abre o mais recente.
- **Excluir treino:** menu de três pontos → `ConfirmDialog` `balanced`; só online e sem pendências na fila (`hasPendingFor`); depois `invalidateTrainingData(qc, { refetchType: "none" })` (não recarrega o treino que sumiu), descarta resumos guardados fora da tela e a cópia no aparelho; toast "Treino excluído" e mostra o mais recente que sobrou no dia (`router.replace`) ou sai da tela.
- **Offline:** `withDeviceCache` (chaves `summary:`, `exercise:`, `trained-exercises`); treino finalizado sem internet e não enviado → `pendingWorkoutSummary` (`lib/offline/local-summary.ts`).
- **Gráfico:** Recharts (`evolution-chart.tsx`), eixo X proporcional ao tempo, pontos de recorde dourados, tendência tracejada, resumo em texto no `aria-label`.
- **Estados de desenvolvimento:** `?estado=` padrao · sem-recordes · livre · pausas · excluir · nao-encontrado · primeira-vez · um-treino · erro · carregando · offline (combináveis; sem `id`, o mock escolhe um exemplo).
- **Mocks:** nada pode rodar no carregamento do módulo (ex.: gerar dados numa constante); senão o build de produção não descarta o mock. Gerar sob demanda.

## Compartilhar nos Stories (folha no fim do treino e no resumo)
- **Design:** Claude Design `ShareSheetScreen.dc.html` (folha) + `StoryArt.dc.html` (34 modelos 1080 × 1920 em 10 estilos). Os modelos foram convertidos do design para TSX com classes Tailwind (`components/share/models/<estilo>.tsx`, um componente `StoryXX` por modelo); catálogo, nomes e disponibilidade em `story-catalog.ts` (Recorde só com recorde; Sequência só com sequência > 0).
- **Dados:** `getShareStoryData` (packages/api/src/share.ts): resumo do treino (`getWorkoutSummary`, inclusive a carga anterior de cada recorde — `previousLoadBest` em core/history.ts) + `get_streak` + meta semanal + `get_training_days` (16 semanas / 2 meses) + séries por grupo no mês. Regras e textos prontos em `packages/core/src/share.ts` (`buildStoryData`: boneco por níveis 1–3, "1h12", "12,4 t", barras e rótulos). Mock: `mocks/share.ts`. Hook: `useShareStory` (chave sob Evolução; cópia no aparelho).
- **Arte:** `StoryArt` (tema escuro fixo, `data-theme="dark"`) e boneco próprio `StoryFigure` (várias regiões acesas; não é o `BodyMap`). Textos neutros em branco (`text-fg`), inclusive legendas e assinatura do site; destaques continuam em volt/dourado. A assinatura acompanha o bloco de informações, com espaço de 24–32 px na arte, sem `mt-auto` empurrando o CTA para o rodapé. Opacidade do fundo 0–100 (0 = PNG transparente para colar sobre a foto).
- **Logo dos stories:** usar `Logo` completo (símbolo + nome), com 88 px de altura na arte 1080 × 1920, em todos os modelos. Esse tamanho também vale para a assinatura e as versões estreitas; ajustar o espaço ao redor sem cortar nem deformar o SVG. A logo do restante do app mantém os tamanhos do design system.
- **Exportar:** `lib/share/story-export.ts` — `storyToPng` (modern-screenshot captura a arte em tamanho real renderizada fora da tela), `shareImage` (Web Share com arquivo; cancelar não é erro) e `downloadImage`. Nada sai do aparelho além do que a pessoa compartilhar. Arquivo `guf-story-<modelo>-AAAA-MM-DD.png`. Treino finalizado sem internet e não enviado: o botão fica indisponível até o envio.
- **Folha:** `ShareStorySheet` (chips de estilo, carrossel com prévias — só os vizinhos ±2 são desenhados —, nome do modelo, opacidade/"Sem fundo", Compartilhar/Baixar, erro com "Tentar"); entrada com Motion. Quem abre mostra o aviso de imagem salva (`STORY_SAVED_TOAST`).

## Mascote (GufRat)
- `components/ds/guf-rat.tsx` (Claude Design "Guf Rat Forte v2"): `<GufRat occasion="workoutDone" animated badge size />`, 30 ocasiões (`GUF_RAT_SPECS`, grupos em `GUF_RAT_GROUPS`). Animações = keyframes `guf-rat-*` (base.css); origem/duração por parte vêm dos dados da pose (estilo inline). Rato sempre branco; contorno no tema claro e braço da frente por tokens `--rat-*` (colors.css), então funciona dentro de seções com outro `data-theme`. Movimento reduzido: parado. Vitrine: `/design-system#mascote`.

## Página 404
- `src/app/not-found.tsx` → `NotFoundScreen` (`components/not-found/`), exportada como `out/404.html`. Logado → "Voltar ao início" (/); sem sessão → "Ir para o login". Redireciona sozinha em 10 s (conta só depois de saber se há sessão); "Ficar aqui" pausa. Animação do anel com keyframes `guf-404-*` (base.css), parada em movimento reduzido.

## Backend (Supabase) — já implementado
Tabelas: profiles, exercises, projects, routines, routine_exercises, workout_sessions, workout_active_periods, session_exercises, set_logs, body_measurements, measurement_values, legal_documents, consent_records, entitlements.

Preenchidos por gatilho (NÃO enviar): `user_id` em routine_exercises, session_exercises e measurement_values; `user_id`, `session_id`, `exercise_id` e `completed_at` em set_logs. (Os tipos gerados marcam esses `user_id` como obrigatórios por serem NOT NULL; omitir e fazer conversão de tipo explícita com comentário.) `workout_sessions.user_id` NÃO tem gatilho: enviar o id do usuário logado. `exercises.user_id` (exercício próprio) também é enviado. Em `workout_active_periods` o `user_id` vem por gatilho e o primeiro período é aberto automaticamente ao criar a sessão (não inserir pelo front). Perfil e plano são criados automaticamente no cadastro.

**Cadastro por e-mail:** os ids das versões vigentes de terms, privacy e age_declaration exibidas na tela vão em `options.data.accepted_document_ids` no `signUp` (com `emailRedirectTo` = origem atual do app e `signup_platform`), e o gatilho `handle_new_user` registra os aceites (`source 'signup_email'`, só versões vigentes; ids inválidos são ignorados e o portão /aceite cobre o que faltar). NÃO chamar `accept_documents` no signUp (sem sessão quando a confirmação de e-mail está ligada).

Funções RPC:
| Função | Uso |
|---|---|
| `pending_documents()` | Portão /aceite (termos, privacidade, idade pendentes) |
| `accept_documents(p_document_ids, p_source, p_platform)` | Registrar aceite (só versões vigentes; versão desatualizada → erro 22023) |
| `has_health_consent()` / `grant_health_consent(p_platform)` / `revoke_health_consent(p_platform)` | Módulo de medidas (revogar apaga as medidas) |
| `get_last_performance(p_exercise_ids)` | Coluna "anterior" no treino |
| `pause_workout(p_session_id, p_at)` / `resume_workout(p_session_id, p_at)` | Pausar/retomar (idempotentes; `p_at` = hora real da ação, para envio offline; o servidor limita a horários válidos) |
| `finish_workout(p_session_id)` | Finaliza treino: fecha o período aberto, grava `active_seconds`; retorna resumo (`duration_seconds` = tempo efetivo, `elapsed_seconds`, `pauses`) + `personal_records` |
| `activate_project(p_project_id)` | Ativa o projeto e desativa o anterior na mesma transação (um ativo por usuário). Erro próprio `GP001` = projeto não encontrado ou arquivado (não usar os códigos de treino) |
| `save_routine(p_routine_id, p_project_id, p_name, p_weekdays, p_exercises)` | Cria (`p_routine_id` nulo) ou atualiza a rotina e seus exercícios planejados numa transação; mudar de projeto põe a rotina no fim da lista. Erros GP001, GP003, GP004 |
| `get_exercise_history(p_exercise_id, p_from)` / `get_exercise_records(p_exercise_id)` | Evolução e recordes |
| `get_training_days(p_from, p_to)` | Calendário |
| `get_streak()` | `current_streak`, `best_streak`, `current_week_count`, `week_secured`, `streak_at_risk` |
| `is_premium()` | Planos pagos (futuro) |
| `auto_finish_idle_workouts(p_idle)` | Só servidor (pg_cron, a cada 5 min): finaliza treinos ociosos de quem ligou `auto_finish_workout` |
| `average_duration_seconds` (campo calculado de `routines`) | Tempo médio da rotina (últimos 5 treinos concluídos); usar no select: `routines(id, average_duration_seconds)` |
| `export_my_data()` | Exportar meus dados (JSON) |

Edge Function: `delete-account` → `supabase.functions.invoke('delete-account', { method: 'POST' })` e depois `signOut()`.

## Regras de negócio
- **Peso sempre em kg no banco**; conversão para lb só na exibição (`profiles.weight_unit`).
- **performed_on** = data LOCAL do usuário (`format(new Date(), 'yyyy-MM-dd')`), nunca deixar o padrão do banco (UTC).
- **Um treino em andamento por vez** (o banco recusa outro): ao abrir o app, retomar o treino aberto. Com treino aberto, a aba "Treinar" e a folha "Iniciar treino" oferecem só retomar.
- **Iniciar treino:** cria a sessão (nome da rotina como snapshot ou "Treino livre") e copia os exercícios planejados para session_exercises; se a cópia falhar, apaga a sessão recém-criada.
- **Excluir projeto:** qualquer projeto exceto o Favoritos. Exclui junto as rotinas e os exercícios planejados (`routines.project_id` com `on delete cascade`); os treinos feitos continuam no histórico (`workout_sessions.routine_id` vira nulo, o nome fica). Excluir o ativo deixa o usuário sem projeto ativo.
- **Um projeto ativo por usuário:** trocar o ativo SEMPRE pela RPC `activate_project` (atômica); nunca em duas gravações pelo app. Desativar (ficar sem projeto ativo) ou arquivar o ativo é uma gravação simples (`is_active = false`; ao arquivar, também desativar).
- **Projetos e rotinas só com internet:** criar, editar, reordenar e arquivar projetos, rotinas e exercícios planejados exige conexão (sem fila offline). Sem internet, as ações de edição ficam bloqueadas com o aviso "Sem conexão – para criar ou editar rotinas, conecte-se à internet." e o conteúdo já carregado continua visível.
- **Trocar exercício de um treino:** apagar o session_exercise e criar outro (mantém número e tipo das séries).
- **Tempo de treino:** `started_at`/`finished_at` = início e fim; tempo efetivo = soma dos períodos de `workout_active_periods` (várias pausas; no máximo um período aberto por treino) e fica em `workout_sessions.active_seconds` ao finalizar. A duração exibida é sempre a efetiva (`active_seconds` ?? fim − início para treinos antigos). Relógio no front: `WorkoutClock` em `packages/core/src/session.ts`.
- **Séries planejadas ao iniciar:** `target_sets` da rotina (sem meta: nº de séries do último desempenho, mínimo 3), carga/reps do último desempenho ou, sem histórico, o mínimo de `target_reps`.
- **Exercício adicionado no treino:** séries do último desempenho (`get_last_performance`), recorde de `get_exercise_records` e descanso de `routine_exercises.rest_seconds` (padrão 90s); sem internet, 3 séries vazias.
- **Observação de exercício:** salva no session_exercise e na `routine_exercises.notes` (vale para os próximos treinos da rotina).
- **Unidade de peso:** `toDisplayWeight`/`fromDisplayWeight` em `packages/core/src/units.ts`; edição em lb com passo 5, em kg com passo 2; atalhos de carga rápida −1 / +1 / +5 / +10 (na unidade exibida).
- **Treino de hoje (projeto ativo):** pelos dias da semana das rotinas (`routines.weekdays`, ISO 1 = segunda … 7 = domingo). Rotina marcada para hoje → é o treino de hoje (várias no mesmo dia: a primeira pela ordem; as demais em "Trocar rotina"). O projeto usa dias e nenhuma rotina é de hoje → **dia de descanso** + o próximo treino da semana ("Amanhã" ou "Qua, 14 out"). Nenhuma rotina com dia marcado → a próxima pela ordem (`position`) depois da última concluída, voltando para a primeira; sem histórico, a primeira. Regra em `todayPlan` (`packages/core/src/schedule.ts`).
- **Card "Treino de hoje" (prioridade):** em andamento > concluído hoje > treino de hoje do projeto ativo **ou** dia de descanso > sem plano (tem rotinas, sem projeto ativo) > usuário novo (nenhuma rotina).
- **Streak:** semana (seg–dom) conta com ≥ 1 treino concluído; semana inteira sem treino zera. `weekly_goal` é só para exibição.
- **Textos do card de sequência** (constantes `STREAK_MESSAGES`, `streakWords` e `weeklyGoalLabel` em packages/core/src/home.ts, usadas na Início e no Histórico): número + "semanas" com "seguidas treinando" abaixo (lê-se "semanas seguidas treinando"); `week_secured` → "Semana garantida ✓" (o ✓ é o ícone Check do lucide) + "X de Y treinos da sua meta" quando houver meta; `streak_at_risk` → "Nenhum treino nesta semana ainda. Treine até domingo para manter sua sequência."; zerada ou usuário novo → "Treine 1 vez até domingo e comece sua sequência."; destaque dourado de recorde quando `current_streak` = `best_streak` e > 0.
- **Série concluída:** só conta o que foi marcado como concluído. Ao finalizar, `finish_workout` APAGA as séries não concluídas (e exercícios que ficaram sem séries) antes de calcular resumo e recordes; histórico, calendário, "anterior" e recordes leem só séries concluídas. O recorde só aparece ao concluir a série (`markLoadRecords` ignora não concluídas e aquecimento).
- **Resumo de um treino:** volume = Σ carga × reps das séries concluídas sem aquecimento (mesma regra de `get_training_days`); "Séries" = séries concluídas sem aquecimento. Duração estimada da rotina = Σ séries × (40s + descanso), com padrão de 3 séries e 90s.
- **Tempo médio da rotina (calculado no banco):** campo calculado `average_duration_seconds` de `routines` (função SQL com parâmetro SEM nome, para o gen types incluí-lo no Row): média da duração efetiva (`active_seconds` ou fim − início) dos últimos treinos concluídos com a rotina, no máximo 5 (com 3, média dos 3); null se nunca treinada. Pedido no select das rotinas em `getHomeSummary` e `getProjectsOverview` (`averageDurationSeconds`). Exibição por `routineDurationLabel`/`routineMeta` (packages/core): "~52 min"; nunca treinada (null) → não mostra tempo. A tela de edição da rotina continua com a estimativa pelo plano (`estimateRoutineMinutes`).
- **1RM estimado:** Epley — carga × (1 + reps / 30). Aquecimentos não contam.
- **Primeira vez de um exercício não gera PR.**
- **Senha do cadastro:** mínimo de 8 caracteres.

## LGPD (não negociável)
- Cadastro: checkbox "Tenho 18 anos ou mais" + checkbox "Li e aceito os Termos de Uso e a Política de Privacidade", ambas desmarcadas; botão desabilitado até marcar.
- Login com Google: após o primeiro acesso, se `pending_documents()` retornar algo → redirecionar para /aceite antes de liberar o app.
- Portão /aceite: lista os documentos pendentes; mostra só as confirmações do que está pendente ("Tenho 18 anos ou mais" para age_declaration; a de Termos/Privacidade para terms ou privacy), sempre desmarcadas; botão só habilita com todas marcadas; botão "Sair" com o mesmo peso. `source` do aceite: `reaccept` se já houver aceite anterior; senão `signup_google` (entrou com Google) ou `signup_email`.
- Consentimento de saúde em camadas: resumo SEMPRE visível (5 itens) + "Ler termo completo" expansível + checkbox desmarcada + botões "Agora não" e "Autorizar e continuar" com o MESMO peso visual.
- Nunca enviar dados de medidas para logs, Sentry ou analytics.
- **Documentos legais (leitor no app):** texto dos 3 documentos em `packages/core/src/legal-content.ts` (estruturado: resumo, seções, tabelas, notas, links e atalhos; **rascunho do protótipo, sem validação jurídica**, com marcadores como [RAZÃO SOCIAL] destacados e a tag "Rascunho · texto fictício" enquanto `LEGAL_CONTENT_IS_DRAFT`). Versão vigente e "em vigor desde" vêm de `legal_documents` (público); o aceite de quem está logado vem de `consent_records` (`getLegalOverview` em packages/api, `useLegalOverview`). Rotas públicas e estáticas (sem login, abrem offline): `/termos` (seção `#idade`), `/privacidade`, `/termo-de-saude` e a central `/documentos` (Perfil › Sobre). Dentro do app os links abrem o leitor POR CIMA da tela (`LegalReaderProvider` nos Providers, `useLegalReader().openLegal`, `LegalDocLink`/`LegalLink` pelo doc_type; z-55; cada leitor entra no histórico e o voltar do sistema fecha): cadastro e `/aceite` mantêm campos e caixas; ler nunca marca a confirmação. Atalhos do texto (exportar, excluir, revogar) → `/perfil#pf-privacy`; visitante ou sem internet ficam indisponíveis. `/aceite` com aceite anterior → "Documento atualizado" + "O que mudou nesta versão" (`changes[versão]` no conteúdo) e só a confirmação do que está pendente. "Em resumo" (`LegalSummary`) é reutilizável no consentimento de saúde. Falta: textos definitivos do jurídico e versões reais por nova migration; nunca inventar redação jurídica nem dados da empresa.

## Autenticação (implementação)
- Google com PKCE: `redirectTo` = `<origem atual>/login?next=<destino validado>`; o código é trocado ao carregar a página. Erros de retorno (`?error=…` ou falha na troca do código) viram mensagem em português na tela de login (`oauthReturnError` em packages/api).
- No painel do Supabase, Redirect URLs com curinga: `http://localhost:3000/**` e `https://<domínio>/**`.

## Design
- Seguir o design system do Guf (Claude Design). A pasta `design/` ainda não existe no repositório: as referências ficam no Claude Design (pedir ao usuário quando precisar).
- **Ícones com significado fixo:** observação (treino, rotina, resumo) = `NotepadText`; editar/renomear = `Pencil`; documento legal = `FileText`. Não reutilizar um desses ícones para outro significado.
- Verde volt `#C6F432` = ação, seleção e conquista. Texto escuro sobre volt. No tema claro, textos/ícones usam verde mais escuro (contraste AA).
- Tema escuro padrão (`#0B0D10`, superfícies `#14171C` / `#1C2027`); tema claro equivalente (`#F6F7F9`). Cores sempre como tokens (variáveis CSS), nunca soltas.
- Toques ≥ 44px; ações de treino ≥ 56px; ação principal na zona do polegar.
- Bottom navigation: Início, Histórico, Treinar (central), Projetos, Perfil. O destaque da aba ativa (tint volt 16%) é UM indicador que desliza e estica até a aba tocada (`useSlidingIndicator` em `components/ds/navigation.tsx`, Web Animations API, sem biblioteca; mede o ícone da aba; movimento reduzido troca direto; some no item central). O `AppShell` move o indicador já no toque (`navIntent`), sem esperar a rota trocar.
- Acessibilidade WCAG AA, foco visível, labels acima dos campos.
- Sem emoji nem caractere unicode como ícone: usar ícones do lucide-react.
- **Logo:** sempre o componente `Logo` (SVG em traços, sem texto de fonte; geometria em `components/ds/brand-geometry.ts`, igual a `assets/guf-logo-*.svg` do Claude Design). Cores pelos tokens: volt + texto no escuro, verde escuro AA + texto escuro no claro; `tone="mono"` herda a cor. Favicon: `src/app/icon.svg`.
- **Carregamento:** `GufLoader` (10 animações do símbolo "Anel"). Padrão do app: **08 (Cometa)** nos botões com `loading`; **09 (Sonar)** na abertura do app (`LoadingScreen`); **07 (Ponto saltitante)** no `SavingOverlay` ao salvar o treino. Telas que carregam conteúdo continuam com **skeleton** na silhueta da tela (como nos protótipos). Movimento reduzido: pulso de opacidade (classes `guf-motion-pulse`/`guf-motion-hide` em base.css).
- **Abertura do app:** `LoadingScreen` (logo animada + "Preparando seu treino") enquanto a sessão/aceites são verificados (`AuthSplash`) e, depois do login, até os dados da Início chegarem (uma vez por sessão, no `AppShell`). Sem internet não bloqueia (treino offline).
- **Símbolo da sequência:** `StreakFlame` (chama sólida, Claude Design "Streak Chama"; cor por `currentColor`, núcleo vazado por máscara). Ativo `text-accent-text`, zerada `text-fg-muted`, em risco `text-warning` com `animate="flicker"`. Animações de evento (`ignite`, `bump`, `milestone`, `out`) existem no componente e na vitrine (`/design-system#sequencia`), mas ainda não estão ligadas a eventos no app. Não usar `Zap` para sequência.
- **Músculos:** `MuscleIcon` (12 grupos, estático/animado/zoom) e `MuscleFilterTile` para filtros; código do banco → ícone com `muscleIconKey` (corpo inteiro e cardio sem ícone).
- **Seletor de exercícios** (`components/exercise-picker/`, usado no Treino e na Rotina): filtro por vários grupos com `MuscleFilterTile size="sm"` (dica de rolagem uma vez por aparelho, `localStorage` "guf-muscle-filter-scrolled"), seções com `MuscleIcon`, exercícios em cartão com selo de equipamento e espaço reservado para a foto (selo + / ✓). Na Rotina, adicionar 1 exercício já abre o cartão dele.
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
