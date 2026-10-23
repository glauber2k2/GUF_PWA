# Painel de administração (guf admin)

**Situação:** implementado em 2026-10-22 (branch `feat/painel-admin`), seguindo o protótipo `Guf Admin.dc.html` do Claude Design. Migration `20261022160000_admin_panel` aplicada em 2026-10-22 (testada antes em transação desfeita); Edge Function `admin-invite-staff` publicada (`ADMIN_APP_URL` = `https://guf-pwa.vercel.app`, endereço do painel); primeiro admin: a conta do desenvolvedor. Antes de abrir a colaboradores além do desenvolvedor: itens da seção 2.2 (gap G24). O que mudou em relação ao plano está na seção 5.

**O que o painel faz**
1. **Contas:** buscar pessoas e ver conta (data de criação, logins vinculados, plano, @, nome, visibilidade do perfil, status dos consentimentos); editar plano, @ e nome; desvincular login social.
2. **Comunicados:** avisos que aparecem quando a pessoa abre o app (tela cheia, modal, toast, faixa), para todos ou para um público: lista de ids, plano, data de criação da conta (antes, no dia, depois), perfil privado ou aberto, consentimento de saúde ativo.

Só colaboradores acessam. O app (PWA hoje, React Native depois) só **recebe** os comunicados.

---

## 1. Decisão de arquitetura

### 1.1 App separado no monorepo: `apps/admin`
| Opção | Veredito |
|---|---|
| **`apps/admin` (Next.js, export estático, outro domínio)** | **Escolhida.** Reaproveita `packages/core`, `schemas`, `api`, `types` e os tokens do design system; não entra no bundle do app do usuário; publicação e permissões separadas; continua valendo quando o app virar nativo |
| Rotas `/admin` dentro do PWA | Não: aumenta o bundle e a superfície de ataque do app de todo mundo, mistura sessões e vai junto para as lojas (revisão da Apple/Google com área escondida) |
| Ferramenta pronta (Retool, Appsmith, Supabase Studio) | Não como produto final: exigiria `service_role` ou acesso direto ao banco, sem a auditoria por ação nem o mínimo de dados que a LGPD pede. O Studio continua só para o desenvolvedor, em emergência |

- **Hospedagem:** projeto próprio na Vercel/Cloudflare (`admin.<domínio>`), `noindex`, cabeçalhos de segurança iguais aos do app + CSP mais restrita.
- **Mesmo projeto Supabase** (mesmos usuários); o painel usa só a chave pública e a sessão do colaborador. **Nunca `service_role` no navegador** (regra 3 do `CLAUDE.md`).
- **Estrutura:** mesmas regras de pastas (`features/<f>/{api,hooks,components,ui}`), camadas e barrel do app. Contratos novos em `packages/api/src/admin/*.ts` (`AdminUsersApi`, `AnnouncementsAdminApi`), consumidos só pelo `apps/admin`; o contrato de leitura dos comunicados (`AnnouncementsApi`) é do app.
- **Componentes:** o design system hoje vive em `apps/web/src/shared/components/ds`. Antes de começar, mover para `packages/ui` (tokens + componentes React) para os dois apps usarem o mesmo; o app React Native terá a própria camada de componentes lendo os mesmos tokens.

### 1.2 Quem é colaborador: papéis no banco, não no front
```
staff_members (user_id pk → auth.users, role, created_by, created_at, disabled_at)
role: viewer · support · admin
```
| Papel | Pode |
|---|---|
| `viewer` | Buscar contas e ver os dados mínimos; ver comunicados e métricas |
| `support` | + editar nome e @, desvincular login social (com motivo), criar rascunhos de comunicado |
| `admin` | + mudar plano, publicar comunicados, gerir colaboradores |

- **Custom Access Token Hook** do Supabase grava `staff_role` no JWT do colaborador (o app comum continua igual). O front usa só para esconder botões; **quem decide é o banco**.
- **MFA obrigatório:** toda função `admin_*` exige `auth.jwt() ->> 'aal' = 'aal2'` (TOTP do Supabase Auth). Sem MFA, o painel só mostra a tela de configurar o segundo fator.
- **Conta de colaborador separada** da conta pessoal de treino (e-mail de trabalho), para a auditoria não misturar uso pessoal e administrativo e para o desligamento ser só `disabled_at`.
- Nenhuma tabela nova ganha política de leitura para `authenticated`: o painel lê e grava **só por funções** `admin_*` (SECURITY DEFINER, `search_path = ''`), que conferem papel + MFA, validam a entrada e gravam a auditoria na mesma transação.

### 1.3 Ações sobre contas
| Ação | Como | Regras |
|---|---|---|
| Buscar | `admin_search_users(query, cursor)` | Por @, nome (prefixo), e-mail exato ou id. Paginação por cursor (keyset em `created_at, id`), 25 por página. Devolve só o resumo (abaixo) |
| Ver conta | `admin_get_user(user_id)` | Grava `staff_viewed_user` na auditoria (quem, quando, motivo opcional) |
| Mudar plano | `admin_grant_plan(user_id, plan, valid_until, reason)` / `admin_revoke_plan_grant(grant_id, reason)` | Reaproveita a lógica de `grant_plan`/`revoke_plan_grant` (hoje só `service_role`), com `source = 'manual'` e o colaborador como autor. Assinatura paga (gateway) nunca é editada à mão |
| Editar @ | `admin_update_handle(user_id, handle, reason)` | Mesma validação de `update_social_handle`; motivos: pedido do titular (correção, Art. 18, III) ou @ ofensivo/impersonação (Termos). A pessoa recebe um comunicado dirigido avisando |
| Editar nome | `admin_update_name(user_id, name, reason)` | Mesmos limites do Perfil; mesmos motivos |
| Desvincular login social | Edge Function `admin-unlink-identity` (servidor, `service_role` só dentro dela) | Só a pedido do titular com identidade conferida (`.lgpd/dsar/workflow.md`); recusa se for o único jeito de entrar (sem senha nem outro provedor); a função confere o papel e o MFA do colaborador pelo JWT antes de agir. Confirmar o endpoint de identidades da Admin API na versão do Supabase em uso; na falta dele, função SQL restrita ao `postgres` |
| Suspender conta | `admin_ban_user(user_id, ends_at, reason)` / `admin_unban_user` | Só Admin. Prazo (1, 7 ou 30 dias, até uma data) ou indeterminado. Encerra as sessões na hora; o token já emitido vale até expirar (até 1 h). O app mostra "Sua conta está suspensa…" no login (`account_suspended`) |
| Excluir conta | `admin_delete_user(user_id, reason)` (agora) ou `admin_schedule_deletion(user_id, at, reason)` / `admin_cancel_deletion` | Só Admin (desde 2026-10-23; antes, só pelo app ou pelo DSAR). Mesma cascata do "Excluir conta" do app (prova dos aceites e `account_deleted` pelos gatilhos). Agendar manda um aviso no app com a data (dá tempo de exportar); o job `execute-scheduled-account-deletions` (a cada 10 min) executa. Conta com foto no Storage é recusada (GA015) até o fluxo apagar o Storage. Conta da equipe ou a própria: GA014 |
| Redefinir senha | Edge Function `admin-reset-password` + `admin_request_password_reset` | Só individual, Suporte+. Manda o e-mail de redefinição do Supabase; a pessoa cria a senha no app (`/redefinir-senha`). A equipe nunca vê nem define a senha (sem "hard reset": §5.4) |
| Ações em lote | Seleção na lista de Pessoas | Mudar plano, desvincular todos os logins sociais (`admin_unlink_social_identities`), suspender, agendar exclusão, excluir e enviar comunicado. Cada conta vai ao banco à parte (uma recusa não impede as outras) e cada uma é auditada; o diálogo mostra quem não mudou e por quê |

**Resumo da conta (o que o painel mostra):** id, @, nome, foto, e-mail **mascarado** (`gl•••@gmail.com`; mostrar inteiro é uma ação com auditoria), data de criação, último acesso, provedores de login, plano efetivo e direitos (origem, validade), visibilidade do perfil, nº de seguidores/seguindo, versões aceitas dos documentos, **consentimento de saúde: sim/não** (nunca as medidas), totais de treinos (contagem).

**Nunca no painel:** medidas corporais, observações de treino/exercício, conversas do GUF AI, séries e cargas, inscrições de push, IP. Se um caso de suporte exigir, o caminho é o DSAR (o titular exporta e envia), não o painel.

### 1.4 Comunicados no app
**Tabelas**
```
announcements
  id, title (≤ 80), body (≤ 600, texto simples ou Markdown restrito: negrito, itálico, link interno),
  format: fullscreen · modal · toast · banner,
  tone: info · success · warning · update,
  cta_label, cta_path (só caminho interno do app, validado como o safeNextPath), image_path (Storage, opcional),
  audience jsonb (regra, abaixo), priority (0–100),
  starts_at, ends_at, frequency: once · until_dismissed,
  purpose: service · legal · product,         -- base legal e quem pode receber (seção 2)
  status: draft · scheduled · published · archived,
  created_by, published_by, created_at, published_at

announcement_targets   (announcement_id, user_id)  -- só para o público "lista de ids"
announcement_receipts  (announcement_id, user_id, seen_at, dismissed_at, cta_at)
```

**Público (regra em `audience`)**, combinável com E:
```json
{ "all": true }
{ "user_ids": true }                                   // lista em announcement_targets
{ "plans": ["free"] }
{ "account_created": { "op": "before" | "on" | "after", "date": "2026-10-01" } }
{ "profile_visibility": "private" | "open" }
{ "health_consent": true }                             // só purpose = legal ou service do módulo (seção 2)
```
- Datas de criação comparadas no fuso de São Paulo (o painel mostra o fuso).
- A regra é validada por um schema Zod em `packages/schemas` (painel) e de novo no banco (`check` + função de validação).

**Entrega: sem fan-out.** O app chama `my_announcements()` ao abrir (depois da `LoadingScreen`) e quando volta para o primeiro plano:
- A função avalia, **no banco e só para quem pergunta**, os comunicados publicados e dentro da janela cuja regra bate com os dados DELA (plano por `effective_plan()`, data de criação, visibilidade, `has_health_consent()`, presença em `announcement_targets`), menos os já vistos/dispensados conforme `frequency`.
- Custo por abertura = nº de comunicados ativos (poucos), com índices em `status, starts_at, ends_at`. Um comunicado para 1 milhão de pessoas não grava 1 milhão de linhas. Só a lista de ids grava destinatários.
- O app nunca recebe a regra nem a lista de outras pessoas: só o conteúdo que deve mostrar.
- `mark_announcement(id, event)` grava `seen`/`dismissed`/`cta` (idempotente).

**No app (PWA hoje, nativo depois)**
- `AnnouncementsApi` em `packages/api` (mesmo contrato para web e React Native) + regra de ordenação e fila em `packages/core` (`nextAnnouncement`): no máximo **1 tela cheia ou modal por abertura**; toasts e faixas podem somar até 2; ordem por `priority`, depois `published_at`.
- Componentes: `fullscreen` (tela por portal, z-[70], fechar sempre visível), `modal` (`ConfirmDialog`-like com 1 ação), `toast` (o `showToast` existente, tom `info`), `banner` (faixa no topo da Início, dispensável).
- Nunca interromper o treino: comunicados só aparecem fora das telas imersivas (`IMMERSIVE_ROUTES`) e nunca com treino em andamento aberto.
- Offline: guarda o último resultado em memória da sessão; o que não foi marcado como visto é marcado quando voltar a conexão.
- Futuro: o mesmo comunicado pode virar notificação push (Web Push existente / FCM-APNs no nativo) com um campo `push: true`, que exige nova avaliação no RIPD social (seção 2).

**Métricas no painel:** alcance estimado antes de publicar (`admin_audience_count(audience)`, só o número), e depois vistos, dispensados e cliques no CTA (contagens agregadas). Sem lista de quem viu.

### 1.5 Auditoria
Reaproveitar `audit_log` (só inclusão, encadeado por hash, 5 anos). Novas ações (incluir no `check` por migration):
`staff_viewed_user`, `staff_revealed_email`, `staff_changed_plan` (ou `plan_granted`/`plan_revoked` com `actor_type = 'staff'`), `staff_changed_handle`, `staff_changed_name`, `staff_unlinked_identity`, `announcement_published`, `announcement_archived`, `staff_member_added`, `staff_member_disabled`.
- `actor_type` ganha `staff`; `details` só com metadados (campo alterado, motivo resumido, versão), nunca o valor antigo de dado pessoal.
- Tela "Auditoria" no painel só para `admin`, filtrando por colaborador, conta e ação.

### 1.6 Escalabilidade
- Busca: índices em `social_profiles(handle text_pattern_ops)`, nome normalizado e `created_at`; paginação por cursor; nada de `count(*)` em telas de lista (só no alcance do comunicado, com cache de 60 s).
- Comunicados: avaliação por usuário no momento da abertura (sem fila nem fan-out); `announcement_receipts` cresce com o uso → retenção de 12 meses depois do fim do comunicado (job pg_cron, como os outros).
- Painel e app são independentes: deploy, versão e rollback separados; os contratos ficam em `packages/api` e quebram o build dos dois se mudarem.
- Quando houver mais de um ambiente (staging/produção), o painel aponta para cada um por variável, com selo visível do ambiente no topo.

### 1.7 Princípios de código (SOLID)
Mesmas camadas do app (`CLAUDE.md`, regra 9): rota → tela (`ui/`) → hooks/`api/` → `packages/api` → Supabase; regra em `packages/core`, validação em `packages/schemas`.

| Princípio | Onde aparece |
|---|---|
| **S** (uma responsabilidade) | O banco autoriza (`admin_*` conferem papel + `aal2`); `packages/api` só acessa dados; `packages/core` decide regras puras (`nextAnnouncement`); a tela só mostra. Uma função por ação (`admin_update_handle`, `admin_grant_plan`, `admin_unlink_identity`…), nunca um "editar usuário" genérico. |
| **O** (aberto para extensão) | **Catálogo de públicos** `AUDIENCE_CRITERIA` (packages/core + schemas): cada critério = validador Zod + rótulo/resumo + chip do construtor; no banco, um avaliador por critério chamado pela função de público. Critério novo = entrada nova + avaliador novo, sem `switch` crescendo. **Catálogo de formatos** `ANNOUNCEMENT_FORMATS` (como o `SET_METRICS` do treino): formato novo = entrada nova com o seu componente. Papéis e permissões em tabela, não em `if` no front. |
| **L** (substituição) | Todo formato de comunicado recebe as mesmas entradas (`AnnouncementView`) e devolve os mesmos eventos (`seen` · `dismissed` · `cta`); o app troca um pelo outro sem saber qual é. Mock e API real com a mesma assinatura (`satisfies`). |
| **I** (interfaces enxutas) | `AnnouncementsApi` (app: listar os meus e marcar) separado de `AnnouncementsAdminApi` e `AdminUsersApi` (painel). O app nunca importa contratos de administração. |
| **D** (depender de contratos) | Telas dependem de `useXxxSource()` (real ou mock), nunca do cliente Supabase. O app nativo reaproveita `AnnouncementsApi` e `nextAnnouncement` sem mudança. Canal de entrega atrás de um contrato: hoje só no app; push depois entra como outra implementação. |

---

## 2. LGPD (avaliação com a skill `lgpd-audit`)

Contexto: Pipeline C já em andamento (`.lgpd/STATUS.md`). Só colaboradores acessam. Colaborador do controlador **não é terceiro** nem operador: age em nome do controlador e fica sujeito ao dever de segurança e sigilo (**Art. 46** e **Art. 47**: quem intervém no tratamento se obriga a garantir a segurança mesmo depois de encerrado o vínculo). Isso torna o painel **viável**, desde que o acesso seja limitado à necessidade.

### 2.1 O que é viável e com qual base
| Item | Viável? | Base / condição |
|---|---|---|
| Ver conta (resumo da seção 1.3) para suporte e operação | Sim | Art. 7º, V (execução do contrato) para suporte; Art. 6º, III (necessidade): só o resumo, e-mail mascarado, auditoria de cada acesso |
| Mudar plano (cortesia, teste, correção) | Sim | Art. 7º, V. Auditoria já existe (`plan_granted`/`plan_revoked`) |
| Editar @ ou nome | Sim, com motivo | A pedido do titular = **direito de correção (Art. 18, III)**; por violação dos Termos = execução do contrato. Avisar a pessoa (transparência, Art. 6º, VI) |
| Desvincular login social | Sim, **só a pedido do titular** | Art. 18 (pedido do titular), identidade conferida pelo fluxo de DSAR; nunca deixar a conta sem acesso |
| Ver se tem consentimento de saúde (sim/não) | Sim, só o status | O status já revela uso do módulo (dado de saúde por inferência, Art. 5º, II). Mostrar só a quem precisa (papel), nunca as medidas |
| Comunicado de serviço (manutenção, novidade, mudança de regra) para todos ou por plano | Sim | Art. 7º, V. `purpose = service` |
| Comunicado legal (nova versão de documento, mudança de política) | Sim | Art. 7º, II e transparência (Art. 9º). `purpose = legal` |
| Comunicado de produto/promoção (ex.: "assine o Pro") | Sim, com cuidado | Legítimo interesse (**Art. 7º, IX + Art. 10**), com LIA, opção de não receber (preferência no app) e frequência limitada. Hoje o `CLAUDE.md` proíbe publicidade sem nova avaliação: comunicação sobre o **próprio** serviço não é publicidade de terceiros, mas precisa da LIA antes |
| Público por **consentimento de saúde** | **Só** `purpose = legal` ou aviso operacional do próprio módulo de medidas | O consentimento do Art. 11, I foi dado para "acompanhar a própria evolução"; usar o status para promover outra coisa é finalidade nova (Art. 6º, I) → **não**. O painel bloqueia `health_consent` com `purpose = product` |
| Público por **perfil privado/aberto** | Sim | Dado comum, escolha do titular no serviço; útil para avisos sobre privacidade |
| Público por **lista de ids** | Sim | Ids colados não vão para logs; a lista é apagada com o comunicado arquivado (retenção) |
| Comunicados para quem pode ser menor de idade | Sem publicidade | Público é 18+ por autodeclaração; **ECA Digital** (Lei 15.211/2025, Arts. 22 e 26) veda perfilamento publicitário de menores: segmentação de `product` não usa nada que funcione como perfil de comportamento |
| Push (fora do app) a partir do painel | **Ainda não** | Exige revisar o RIPD social (A020) e a Política: hoje os avisos no celular são só competição e seguidores |
| Exportar listas de usuários (CSV) | **Não** na 1ª versão | Risco de vazamento sem necessidade clara; se surgir, com papel `admin`, motivo e auditoria |

### 2.2 Medidas obrigatórias antes de abrir o painel
1. **Termo de confidencialidade** assinado por cada colaborador (Art. 47) e orientação curta (o que pode ver, como tratar pedidos). Registrar em `.lgpd/` (lista de quem tem acesso, sem dados pessoais além do nome).
2. **MFA obrigatório**, papéis mínimos, desligamento no mesmo dia (`disabled_at`), revisão trimestral de quem tem acesso (Art. 46; Guia de Segurança da Informação para Agentes de Tratamento de Pequeno Porte, da ANPD).
3. **Auditoria de leitura individual** (`staff_viewed_user`) e de toda alteração, com motivo (Art. 6º, X, responsabilização).
4. **Mascaramento** de e-mail e nenhuma tela com medidas, observações, conversas ou cargas (Art. 6º, III).
5. **Política de Privacidade:** nova versão mencionando (a) que a equipe pode acessar dados da conta para suporte, com registro, e (b) comunicados no app e o direito de recusar os de `product`. `requires_reaccept = false` se só detalhar o que já é execução do contrato ⚖.
6. **ROPA / mapa de dados:** novas atividades **A022 — Administração e suporte da conta** e **A023 — Comunicados no app**; `retention.md` com `announcement_receipts` (12 meses) e listas de ids (até arquivar).
7. **LIA** para comunicados de `product` (`.lgpd/lia/a023-comunicados.md`) antes de enviar o primeiro.
8. **RIPD:** não é exigido para o painel em si (sem larga escala nem decisão automatizada); revisar o `ripd-medidas-corporais` (§4) para registrar que o status do consentimento é visível à equipe e usável só em `purpose = legal`.
9. **Incidentes:** o painel entra no runbook (`.lgpd/incidents/runbook.md`): conta de colaborador comprometida = incidente; desligar o colaborador e revisar a auditoria.

> Dúvidas jurídicas marcadas com ⚖ (base dos comunicados de produto, mudança da Política sem novo aceite): confirmar com advogado especializado em proteção de dados antes do lançamento público.

---

## 3. Roteiro de entrega
| Etapa | Entrega |
|---|---|
| 0 | Mover o design system para `packages/ui`; criar `apps/admin` (Next export estático) com login, MFA e o portão de colaborador |
| 1 | Migration: `staff_members`, hook do token, `audit_log` com `actor_type = 'staff'` e as novas ações; funções `admin_search_users`, `admin_get_user` |
| 2 | Contas: busca, detalhe, editar plano, @ e nome (com motivo), auditoria visível |
| 3 | Comunicados no app: tabelas, `my_announcements`, `mark_announcement`, `AnnouncementsApi`, componentes de exibição no PWA, estados de dev (`?estado=`) |
| 4 | Painel de comunicados: lista, editor com prévia, construtor de público com alcance, agendar, publicar, métricas |
| 5 | Desvincular login social (Edge Function) + integração com o fluxo de DSAR |
| 6 | Itens LGPD da seção 2.2 (Política, ROPA, LIA, runbook) — **antes de abrir para colaboradores além do desenvolvedor** |

Cada etapa segue o fluxo do `CLAUDE.md`: função em `packages/api` → mock → hook → tela → barrel → rota; testes do banco em transação desfeita; `pnpm lint`, `typecheck` e `build`.

---

## 4. Prompt para o Claude Design

Copiar o bloco abaixo inteiro no Claude Design (projeto do guf, com o design system "guf").

```text
Crie o protótipo do "guf admin", painel interno da equipe do guf (app de evolução de musculação). Use o design system do guf já existente neste projeto: tema escuro padrão (#0B0D10, superfícies #14171C e #1C2027) com tema claro equivalente (#F6F7F9), verde volt #C6F432 só para ação principal, seleção e destaque (texto escuro sobre volt; no tema claro, verde escuro com contraste AA), fonte Inter para interface e Barlow Condensed com números tabulares para números, ícones lucide (nunca emoji), cantos e sombras dos tokens. A marca se escreve "guf" (minúsculo), nunca "guff". Textos em português do Brasil, curtos, diretos e sem jargão técnico. Mensagens de erro dizem o que aconteceu e como resolver.

PÚBLICO E OBJETIVO
Colaboradores de suporte e operação, não técnicos, usando computador na maior parte do tempo, mas também tablet e celular. Precisa ser fácil de entender na primeira vez, rápido para tarefas repetidas e difícil de errar em ações sensíveis.

RESPONSIVIDADE (mostrar cada tela nos três tamanhos)
- Celular 390 px: barra superior com o título e menu em gaveta; listas viram cartões; ações principais fixas no rodapé, na zona do polegar; toques de no mínimo 44 px.
- Tablet 834 px: barra lateral recolhível só com ícones; listas em tabela compacta; detalhe abre em painel lateral.
- Computador 1440 px: barra lateral fixa com rótulos; tabela completa com colunas ordenáveis; detalhe abre num painel à direita sem perder a lista.
- Selo do ambiente sempre visível no topo ("Produção" em vermelho discreto, "Teste" em neutro) e o papel do colaborador (Leitura, Suporte, Admin).

TELAS
1. Entrar: e-mail e senha; depois, código do aplicativo autenticador (segundo fator obrigatório). Tela de "configurar segundo fator" para o primeiro acesso. Estado "Sua conta não tem acesso ao painel" com o contato de quem libera.
2. Início: atalhos (Buscar pessoa, Novo comunicado), comunicados ativos e agendados, últimas ações da equipe (para admin).
3. Pessoas – busca: campo grande "Buscar por @, nome, e-mail ou id" com resultados enquanto digita; cada resultado mostra foto, nome, @, plano (selo), data de criação e um ícone de cadeado se o perfil for privado. Estados: vazio inicial com dica, sem resultados, carregando (skeleton), erro.
4. Pessoa – detalhe, com seções: Conta (id copiável, data de criação, último acesso, e-mail mascarado com o botão "Mostrar e-mail" que avisa que o acesso fica registrado), Logins (e-mail/senha, Google, com "Desvincular" ao lado do login social), Plano (plano atual, origem, validade, histórico), Perfil social (@, nome, privado/aberto, seguidores/seguindo), Documentos aceitos (nome e versão), Consentimento de saúde (só "Autorizado" ou "Não autorizado", com a nota "As medidas não aparecem no painel"), Atividade da equipe nesta conta (quem viu ou alterou, quando e por quê). Deixar claro, com uma faixa discreta, que medidas, observações e conversas não são visíveis no painel.
5. Editar plano, @ e nome: folha/diálogo com o valor atual, o novo valor, validação na hora (ex.: @ já em uso) e o campo obrigatório "Motivo" com opções (Pedido da pessoa, Violação dos Termos, Cortesia/teste, Outro + texto). Resumo antes de confirmar.
6. Desvincular login social: diálogo explicando a consequência, checagem "Pedido confirmado pela pessoa" e bloqueio claro quando for o único jeito de entrar ("Esta pessoa ficaria sem acesso. Peça para ela criar uma senha antes.").
7. Comunicados – lista: abas Rascunhos, Agendados, Ativos, Encerrados; cada item com formato (tela cheia, modal, toast, faixa), público resumido em texto ("Plano Free · contas criadas depois de 1 out"), período e números (alcance, vistos, cliques).
8. Comunicado – editor em 4 passos com indicador de progresso (no computador, o formulário à esquerda e a prévia ao vivo à direita; no celular, a prévia num botão "Ver prévia"):
   a) Conteúdo: formato (4 cartões com miniatura de cada formato), tom (Informação, Sucesso, Atenção, Novidade), título, texto, botão opcional (rótulo + tela do app de destino escolhida numa lista), imagem opcional.
   b) Público: construtor de regras em "chips" combináveis (Todos, Lista de ids colada ou arquivo, Plano, Data de criação da conta com Antes/No dia/Depois e calendário, Perfil privado ou aberto, Com consentimento de saúde) unidas por "E", com o alcance estimado atualizando ("cerca de 1.240 pessoas"). Ao escolher "Com consentimento de saúde", mostrar o aviso de que só vale para comunicados legais ou do módulo de medidas e desabilitar a finalidade "Produto".
   c) Quando: começar agora ou em data e hora (fuso de Brasília visível), terminar em, frequência (Mostrar uma vez / Até a pessoa fechar), prioridade.
   d) Revisar e publicar: resumo de tudo, finalidade (Serviço, Legal, Produto) e o botão "Publicar" (ou "Agendar"); confirmação final com o alcance.
   Prévia ao vivo dentro de uma moldura de celular mostrando exatamente como aparece no app guf: tela cheia (imagem, título, texto, botão volt e "Agora não"), modal centralizado, toast no rodapé e faixa no topo da Início, nos temas escuro e claro.
9. Comunicado – resultado: números grandes (alcance, vistos, fechados, cliques no botão) com barras simples; botões Encerrar agora e Duplicar.
10. Auditoria (só admin): tabela filtrável por colaborador, pessoa, ação e período; linha expande com o motivo.
11. Equipe (só admin): lista de colaboradores com papel e status do segundo fator; convidar, mudar papel, desativar (confirmação).

PADRÕES DE UX
- Ações destrutivas ou sensíveis sempre com diálogo de confirmação que descreve a consequência; botões com o mesmo peso quando a escolha não deve ser empurrada.
- Depois de salvar, toast de sucesso; erros perto do campo; nada de tela vazia sem explicação.
- Navegação: Início, Pessoas, Comunicados, Auditoria, Equipe. Atalho de teclado "/" para buscar no computador.
- Acessibilidade WCAG AA: foco visível, rótulos acima dos campos, alvos de 44 px, tipo de cada aviso indicado por ícone e texto (nunca só cor), suporte a movimento reduzido.
- Tabelas com cabeçalho fixo, paginação "Carregar mais" e estados de carregando (skeleton), vazio e erro.

ENTREGA
Um canvas com cada tela nos três tamanhos (celular, tablet, computador), tema escuro e claro do editor de comunicados e da prévia, e os estados principais (carregando, vazio, erro, sem permissão). Não inclua moldura de navegador nem dados reais: use pessoas fictícias.
```

---

## 5. Implementação (2026-10-22)

### 5.1 O que mudou em relação ao plano
| Plano | Implementado | Por quê |
|---|---|---|
| Custom Access Token Hook põe `staff_role` no JWT | O papel é lido de `staff_members` a cada chamada (`require_staff`); o painel pergunta por `admin_me()` | Desativar ou mudar o papel vale na hora (o token só mudaria na renovação) e não depende de configurar o hook no painel do Supabase |
| `admin_grant_plan` / `admin_revoke_plan_grant` | `admin_set_plan(user, plano, validade, motivo)` | Uma ação = "o plano manual desta pessoa passa a ser X": revoga os direitos manuais ativos e cria o novo (ou só revoga, para o plano padrão). Assinatura paga ativa → GA005 |
| Desvincular login pela Edge Function | Função SQL `admin_unlink_identity` (SECURITY DEFINER) | A Admin API do Supabase não desvincula identidade de outra pessoa; a função apaga a identidade e atualiza `providers`, recusando se for o único jeito de entrar (GA006) |
| Imagem no comunicado | Fica para depois | Precisa de bucket no Storage com política de escrita só para admin; o editor avisa |
| Convite de colaborador | Edge Function `admin-invite-staff` | Criar a conta de trabalho e mandar o link exige `service_role`, que nunca vai ao navegador |
| Papéis (protótipo: Suporte muda plano e publica) | Plano, publicar/encerrar comunicado, auditoria e equipe = **Admin**; Suporte edita @/nome, desvincula, mostra e-mail e cria rascunhos; Leitura só consulta | Regra mais restrita do documento (seção 1.2); o painel esconde o que o papel não pode e o banco recusa (GA003) |

### 5.2 Onde está cada parte
- **Banco:** `supabase/migrations/20261022160000_admin_panel.sql` — `staff_members`, `require_staff`, `staff_audit`, `admin_*`, `announcements` (+ `announcement_targets`, `announcement_receipts`), avaliadores de público por regra, `my_announcements`, `mark_announcement`, job `purge-expired-announcements`. Erros GA001–GA013 → `packages/api/src/result.ts`.
- **Contratos:** `packages/api/src/admin/` (`StaffSessionApi`, `AdminUsersApi`, `AnnouncementsAdminApi`, `StaffTeamApi`; entrada `@guf/api/admin`, só o painel importa) e `packages/api/src/announcements.ts` (`AnnouncementsApi`, do app).
- **Regras:** `packages/core/src/staff.ts` (papéis, `canStaff`, motivos, textos da auditoria) e `packages/core/src/announcements.ts` (catálogos de formato, tom, finalidade e público `AUDIENCE_CRITERIA`, `nextAnnouncements`). Validação: `packages/schemas/src/admin.ts`.
- **Design system compartilhado:** `packages/ui` (mudou de `apps/web/src/shared/components/ds`; o app reexporta pelo mesmo caminho). Os comunicados usam os mesmos componentes no app e na prévia do painel (`ds/announcement.tsx`).
- **Painel:** `apps/admin` (Next export estático, porta 3001 no dev). Rotas: `/entrar` (Google ou e-mail e senha), `/entrar/esqueci` (link para senha nova, cai em `/primeiro-acesso?motivo=senha`), `/entrar/codigo`, `/entrar/segundo-fator`, `/primeiro-acesso`, `/sem-acesso`, `/`, `/pessoas?q=&id=`, `/comunicados?aba=`, `/comunicados/editar?id=`, `/comunicados/resultado?id=`, `/auditoria`, `/equipe`. Estados de desenvolvimento: `?estado=` admin · suporte · leitura · entrar · sem-acesso · configurar · codigo · carregando · erro · vazio (mocks em `apps/admin/src/mocks`).
- **App:** `features/announcements` (`AnnouncementsHost` no layout logado; `HomeAnnouncementBanner` no `topSlot` da Início). Não aparece com treino em andamento, em telas imersivas ou antes da abertura terminar (`useAppShell().isBusy`). Dev: `/?estado=padrao,aviso-modal` (aviso-tela-cheia · aviso-toast · aviso-faixa · aviso-todos).

### 5.3 Suspensão, exclusão e ações em lote (2026-10-23)
- **Banco:** `supabase/migrations/20261023120000_admin_bans_and_deletion.sql` — `account_bans` (intenção: prazo ou indeterminado, motivo; uma aberta por conta) + `auth.users.banned_until` (quem barra o login; indeterminado = 2999-12-31, o Supabase Auth não aceita `infinity`), `account_deletion_schedules` (uma por conta; `last_error` quando o job não conseguiu), `admin_ban_user`, `admin_unban_user`, `admin_delete_user`, `admin_schedule_deletion`, `admin_cancel_deletion`, `admin_unlink_social_identities`, job `execute-scheduled-account-deletions` (o aviso da exclusão agendada foi encurtado em `20261023140000_admin_schedule_deletion_notice`: passava dos 160 caracteres de `announcements.body` e desfazia o agendamento). `admin_search_users` devolve `is_banned`, `ban_ends_at` e `deletion_scheduled_for`; `admin_get_user` devolve `ban`, `deletion`, `is_staff` e os documentos vigentes **aceitos ou não** (`status`: accepted · outdated · not_accepted, mesma regra de `pending_documents_of`). Erros GA014 (conta da equipe), GA015 (arquivos no Storage), GA016 (data no passado).
- **Permissões:** `ban_accounts` e `delete_accounts` = Admin (`STAFF_PERMISSIONS`).
- **Painel:** seleção na lista (caixa por linha e "selecionar todos"; continua entre buscas e, com a busca vazia, a lista mostra as selecionadas) com a `BulkActionBar` (grade de botões quadrados); três pontinhos em cada linha e no detalhe (`AccountActionsMenu` sobre o `ActionMenu` de `shared/components`, também usado na Equipe); um diálogo para todas as ações (`AccountActionDialog` + `useAccountActionForm` + `useAccountActionRunner`). "Editar conta" envia de uma vez o que mudou entre @, nome e plano (um motivo para todos; se uma falhar, as já gravadas não são reenviadas). Enviar comunicado para pessoas escolhidas: `/comunicados/editar?para=id,id` abre o editor com a regra "Pessoas específicas"; no passo Público, a busca adiciona pessoas à lista.

### 5.4 Redefinir senha (2026-10-23, só individual)
- **Fluxo:** detalhe ou três pontinhos da conta → "Redefinir senha" (motivo obrigatório; papel Suporte+; nunca em lote) → `sendPasswordReset` → Edge Function `admin-reset-password` → `admin_request_password_reset` com o token do colaborador (equipe, aal2, papel, conta não suspensa — GA017 —, com e-mail — GA018 —; audita `staff_sent_password_reset`) → e-mail de redefinição do Supabase Auth (cliente implícito: o link funciona no aparelho da pessoa) → app `/redefinir-senha` (`ResetPasswordForm` + `useRecoverySession`: abre a sessão pelo `#access_token`, tira os tokens do endereço, senha nova duas vezes com `newPasswordSchema`).
- **A equipe nunca vê nem escolhe a senha, e o e-mail da pessoa não passa pelo navegador da equipe** (a função busca com a service_role). Sem usar o link, a senha antiga continua; o prazo do link é o "Email OTP Expiration" do Supabase Auth (padrão 1 h; recomendado 900 s).
- **Decisão (LGPD):** não há "hard reset" em que o admin define ou recebe uma senha ou link para entregar à pessoa: quem tem esse acesso entra como a pessoa e vê dados de saúde (Art. 11; Art. 46; Art. 6º, III), o que o A022 exclui. Quem perdeu o e-mail segue o fluxo de DSAR com conferência de identidade e troca do e-mail.
- **Configurar:** secret `APP_URL` (endereço do app, ex. `npx supabase secrets set APP_URL=https://<app>`); `https://<app>/**` nas Redirect URLs do Supabase Auth. Sem `APP_URL`, a função responde `password_reset_unavailable`.

### 5.5 Colocar no ar
1. Aplicar a migration (`npx supabase db push`) e regenerar os tipos.
2. Primeiro admin (SQL Editor do Supabase, como `postgres`): `select public.register_staff_member('<user_id da conta de trabalho>', 'Nome', 'admin');`
3. Secrets da Edge Function: `ADMIN_APP_URL` (ex.: `https://admin.<domínio>`), `STAFF_EMAIL_DOMAIN` (opcional), `ALLOWED_ORIGINS` incluindo o domínio do painel. Publicar: `npx supabase functions deploy admin-invite-staff --use-api`.
4. Supabase Auth: TOTP ligado (padrão) e Redirect URLs `https://admin.<domínio>/**` e `http://localhost:3001/**` (volta do Google, convite e "Esqueci a senha"; sem elas o Supabase manda para o Site URL, que é o app). O link de "Esqueci a senha" usa PKCE: precisa ser aberto no mesmo navegador em que foi pedido. Entrar pelo Google ou por senha não dispensa o segundo fator.
5. Vercel: projeto novo com Root Directory `apps/admin` (o `vercel.json` traz `noindex`, CSP e cabeçalhos); variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ADMIN_ENV` (`prod` ou `test`), `NEXT_PUBLIC_STAFF_EMAIL_DOMAIN`.
