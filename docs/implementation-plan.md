# Plano de implementação — Guf App

> Atualizado em 11/10/2026 · Branch de referência: `main` (até o PR #23)
> Regras de negócio: [`business-rules.md`](./business-rules.md) · Instruções técnicas: [`CLAUDE.md`](../CLAUDE.md)

## 1. Situação atual

### Entregue

Tudo abaixo está na `main` (número do PR entre parênteses).

| Etapa | Branch | PR |
|---|---|---|
| Design system do Guf (tokens, componentes, vitrine `/design-system` só em dev) | `feat/design-system` | #1 |
| Login e cadastro por e-mail com aceite LGPD | — | — |
| Tela Início com dados reais (treino de hoje, semana, sequência) | `feat/inicio`, `feat/inicio-dados` | #2, #3 |
| Login com Google (PKCE) e portão `/aceite` | `feat/login-google` | #4, #5 |
| Treino em andamento (`/treino`): séries, exercícios, descanso, pausas, tempo efetivo, offline, mini card | `feat/treino`, `feat/treino-integracao` | #7 |
| Histórico (`/historico`): sequência, calendário, folha do dia com recordes, gráfico de volume | `feat/historico` | #8 |
| Documentação (`docs/`: plano e regras de negócio) | `chore/documentacao` | #9 |
| "Ver no histórico" do resumo do treino abre `/historico` | `fix/ajustes-historico` | #10 |
| Projetos e Rotina (`/projetos`, `/projetos/detalhe`, `/rotina`): projetos (Favoritos padrão), rotinas com dias da semana e exercícios planejados; treino de hoje e dia de descanso na Início | `feat/projetos` | #11, #12 |
| Excluir projeto (exceto Favoritos) com as rotinas dele | `feat/excluir-projeto` | #14 |
| Logo em SVG, `GufLoader` (10 animações), telas de carregamento e ícones de músculo | `feat/marca-e-loading` | #15 |
| PWA instalável (Serwist), abertura offline e aviso de nova versão | `feat/pwa` | #16 |
| Salvar rotina volta para o projeto e mostra "Salvando rotina" | `fix/salvar-rotina` | #17 |
| Perfil (`/perfil`): nome, foto, instalar o app (por plataforma), unidade, meta, tema, exportar dados, documentos aceitos, revogar consentimento de saúde, excluir conta, versão e sair | `feat/perfil` | #18 |
| Resumo do treino (`/treino/resumo`), evolução por exercício (`/exercicio`), busca (`/exercicio/busca`) e excluir treino | `feat/evolucao` | #19 |
| Busca flexível de exercícios por pedaços de palavras | `feat/busca-flexivel` | #20 |
| Novo visual do seletor de exercícios (Treino e Rotina) | `feat/seletor-exercicios` | #21 |
| Página 404 personalizada | `feat/pagina-404` | #22 |
| Ajustes visuais: loader 09 (Sonar) na abertura e 08 (Cometa) nos botões; fechar o `BottomSheet` arrastando para baixo; ícone `NotepadText` na observação | `feat/ajustes-visuais` | #23 |
| Novo Toast (protótipo `Toast.dc.html`): 7 tipos com ícone animado, pilha com até 3 visíveis, barra de tempo de 5 s, expandir/pausar, arrastar para dispensar e "carregando → sucesso" | `feat/toast` | — |
| Documentos legais no app: leitor único (`/termos`, `/privacidade`, `/termo-de-saude`), central `/documentos`, leitura por cima da tela no cadastro, `/aceite` ("O que mudou") e Perfil | `feat/documentos-legais` | — |
| Menu inferior: indicador da aba ativa desliza (e estica) até a aba tocada, já no toque | `feat/indicador-aba-animado` | — |

### Lacunas conhecidas no que já existe

| Lacuna | Onde | Impacto |
|---|---|---|
| Textos dos documentos legais são rascunho do protótipo (marcadores [RAZÃO SOCIAL], [CNPJ]…), sem validação jurídica | `packages/core/src/legal-content.ts` | **Bloqueia o lançamento** (LGPD) |
| Documentos legais do banco são provisórios (`0.1-dev`, hash `DEV-PLACEHOLDER`) | `supabase/seed.sql` | **Bloqueia o lançamento** |
| Leitor de documentos (histórico do navegador, voltar do Android) ainda não testado em aparelho real | `components/legal/legal-reader-provider.tsx` | Baixo |
| Tela de consentimento de saúde ainda não existe (chega com o módulo de medidas); o `LegalSummary` já está pronto para ela | Etapa 4 | Médio |
| `ConfirmDialog` não fecha com Esc nem prende o foco dentro da caixa (o `BottomSheet` já fecha com Esc) | `components/ds/overlays.tsx` | Baixo no celular; pendência de acessibilidade (teclado) |
| Fechar o `BottomSheet` arrastando para baixo ainda não foi testado em aparelho real | `hooks/use-sheet-drag.ts` | Baixo |
| Pilha de toasts (arrastar para dispensar, tocar para expandir) ainda não foi testada em aparelho real | `components/ds/toast.tsx` | Baixo |
| Iniciar treino não funciona sem internet | `startWorkout` cria a sessão no servidor | Baixo (limitação aceita) |
| Não há testes automatizados no repositório (as regras foram testadas com scripts avulsos) | Monorepo | Médio: risco de regressão |

## 2. Próximas etapas (ordem recomendada)

A ordem prioriza o que impede o uso real do app (criar rotinas), depois o que completa o ciclo de evolução
(resumo e histórico por exercício), depois os direitos do usuário (Perfil/LGPD) e, por fim, instalação e lançamento.

Cada etapa segue o mesmo fluxo: branch própria a partir da anterior → plano curto → implementação (core → api → web)
→ `pnpm lint`, `pnpm typecheck`, `pnpm build` → testes das regras → atualização deste plano, de `business-rules.md`
e do `CLAUDE.md` → commit/push e PR.

---

### Etapa 0 — Ajustes rápidos (antes da próxima funcionalidade)

**Branch:** `fix/ajustes-historico`

- [x] "Ver no histórico" do resumo do treino → navega para `/historico` (finalizado sem internet: avisa que o treino aparece quando a conexão voltar).
- [x] Abrir os PRs da `feat/historico`, da `chore/documentacao` e desta branch, nessa ordem, e fazer o merge (#8, #9, #10).
- [ ] Confirmar no painel do Supabase as Redirect URLs com curinga (`http://localhost:3000/**` e o domínio de testes).

**Critério de aceite:** nenhum "chega em breve" para telas que já existem.

---

### Etapa 1 — Projetos e rotinas (aba "Projetos")

**Branch:** `feat/projetos` · **Prioridade:** alta (sem ela o usuário não planeja treinos)

**Andamento:** [x] migration `activate_project` · [x] lista e detalhe de projetos · [x] migration `routine_schedule_and_favorites` (dias da semana, Favoritos, `save_routine`) · [x] tela de Rotina · [x] treino de hoje por dia e dia de descanso na Início · [x] PR (#11, #12; excluir projeto em #14)

**Escopo**
- Lista de projetos (ativo em destaque, arquivados separados) e criação/edição/arquivamento.
- Ativar projeto: um ativo por usuário (desativar o atual antes de ativar outro).
- Rotinas do projeto: criar, renomear, reordenar (`position`), arquivar.
- Exercícios planejados da rotina: adicionar pelo seletor de exercícios já existente (com criação de exercício próprio), reordenar, definir séries, repetições alvo (texto livre: "10", "8-12", "falha") e descanso.
- Atalhos: "Criar rotina" da Início e folha "Iniciar treino" levam para cá quando não há rotinas.

**Telas/rotas (query string, site estático):** `/projetos`, `/projetos/detalhe?id=…`, `/rotina?id=…`.

**Dados:** tabelas `projects`, `routines`, `routine_exercises` (já existem, com RLS).
Troca do projeto ativo pela RPC `activate_project` (migration `20261010190244_activate_project.sql`, **já aplicada** no Supabase): atômica, erro próprio `GP001`.

**Reaproveitar:** `ExercisePicker`, `usePointerReorder` (o `ReorderList` do design system não funciona no toque), `ProjectCard`, `RoutineCard`, `SheetOption`, `ConfirmDialog` e formulários com React Hook Form + Zod (schemas em `packages/schemas`).

**Critérios de aceite**
- Usuário novo cria projeto → rotina → exercícios e inicia o treino planejado pela Início.
- Ativar outro projeto nunca deixa dois ativos nem nenhum ativo por erro.
- Arquivar rotina não apaga o histórico de treinos feitos com ela.

**Decisões tomadas:** edição de projetos e rotinas **só com internet** — sem conexão, bloquear as ações de edição com o aviso "Sem conexão – para criar ou editar rotinas, conecte-se à internet." (o conteúdo carregado continua visível); troca de projeto ativo pela RPC atômica.

**Decisões pendentes:** design da aba no Claude Design.

---

### Etapa 2 — Resumo do treino e histórico por exercício

**Branch:** `feat/evolucao` · **Prioridade:** alta (é a promessa central do app: ver a evolução)

**Escopo**
- **Resumo de um treino concluído** (`/treino/resumo?id=…`): duração efetiva, volume, séries, exercícios com as séries feitas e recordes daquele treino. Aberto pela folha do dia do Histórico e pelo card "Concluído" da Início.
- **Evolução por exercício** (`/exercicio?id=…`): carga máxima, 1RM estimado, volume por treino (gráfico Recharts), recordes pessoais (carga, 1RM, volume) e lista dos últimos treinos.
- Acesso pelo resumo do treino, pelo cartão do exercício no treino e por uma busca de exercícios no Histórico.

**Dados:** `get_exercise_history(p_exercise_id, p_from)` e `get_exercise_records(p_exercise_id)` já existem. Recordes de um treino passado: mesma regra já usada na folha do dia (`sessionLoadRecord`).

**Critérios de aceite:** valores do app iguais aos do banco (mesmas regras de volume, 1RM e recorde); primeira vez do exercício não gera recorde; peso em kg ou lb conforme o perfil.

**Implementado (`feat/evolucao`)**
- API `packages/api/src/evolution.ts` (`EvolutionApi`): `getWorkoutSummary`, `deleteWorkout`, `getExerciseEvolution` (números oficiais do `get_exercise_history` + séries para as repetições e a série do 1RM) e `listTrainedExercises`. Regras puras em `packages/core/src/evolution.ts`. Sem migration.
- Telas: `components/summary/` (resumo + excluir) e `components/evolution/` (evolução com gráfico Recharts, busca, cabeçalho e rotas). Abertas pela folha do dia do Histórico, pelo card "Concluído" e pela folha do dia da Início (vários treinos no dia → o mais recente), pelos recordes e exercícios do resumo e pelo atalho "Ver evolução de um exercício" do Histórico.
- Offline: cópia no aparelho (`withDeviceCache`, mesma tabela do Histórico); treino finalizado sem internet e ainda não enviado mostra o resumo calculado no aparelho (`lib/offline/local-summary.ts`).
- Mock `apps/web/src/mocks/evolution.ts` + `?estado=` (ver CLAUDE.md).
- O atalho no cartão do exercício na tela de Treino não entrou (o protótipo não mostra).

---

### Etapa 3 — Perfil, preferências e privacidade (LGPD)

**Branch:** `feat/perfil` · **Prioridade:** alta para o lançamento (direitos do titular)

**Escopo**
- Dados: nome, e-mail (só leitura), foto (opcional, avaliar armazenamento).
- Preferências: unidade de peso (kg/lb), meta semanal (1 a 7, só exibição), tema claro/escuro.
- Privacidade: **exportar meus dados** (`export_my_data()` → arquivo JSON), ver documentos aceitos, **revogar consentimento de saúde**, **excluir conta** (Edge Function `delete-account` + `signOut()`), sair da conta.
- Páginas públicas dos documentos: `/termos`, `/privacidade`, `/termo-de-saude` (conteúdo vindo dos textos definitivos).

**Critérios de aceite**
- Excluir conta pede confirmação explícita, apaga os dados no servidor e limpa o aparelho (cache, treino ativo, IndexedDB).
- Exportação contém só os dados do usuário logado.
- Trocar kg/lb muda só a exibição (banco continua em kg).

**Riscos:** textos legais precisam de **validação jurídica** antes da produção.

**Implementado (`feat/perfil`)**
- Tela `/perfil` (aba Perfil): `components/profile/*`, dados em `packages/api/src/profile.ts` (`getProfile`, `updateProfile`, `getConsents`, `revokeHealthConsent`, `exportMyData`, `deleteAccount`), regras puras em `packages/core/src/profile.ts` e `pwa.ts`, validação em `packages/schemas/src/profile.ts`.
- Mock em `apps/web/src/mocks/profile.ts` (`satisfies ProfileApi`) com `?estado=` só em desenvolvimento: `padrao`, `sem-saude`, `erro`, `carregando`, `offline`, `pendente` e a plataforma (`android`, `ios-safari`, `ios-outro`, `instalado`, `desconhecido`). O mock nunca exclui conta nem revoga de verdade.
- Tema Escuro/Claro/Sistema salvo no aparelho (`lib/theme/theme.ts`), aplicado antes da pintura por script no `<head>`.
- Estado do PWA (`lib/pwa/pwa-store.ts`): convite de instalação guardado, app instalado e versão nova esperando (o mesmo estado do aviso "Nova versão do guf disponível").
- Versão do app = `version` do `apps/web/package.json` (`NEXT_PUBLIC_APP_VERSION`).
- Foto do usuário no Perfil e na Início: foto do Google (inclusive conta de e-mail vinculada ao Google depois) com a inicial como reserva; prioridade já preparada para a foto enviada pelo usuário.
- **Pendente:** upload de foto própria (migration do bucket `avatars` + políticas de acesso e tela de envio/corte) e os textos definitivos dos documentos legais (validação jurídica).
- **Documentos legais — próximos passos (definidos em 11/10/2026):**
  1. Desenhar no Claude Design: leitor de documento único para os 3 documentos (cabeçalho com voltar, versão e "em vigor desde", bloco "Em resumo" sempre visível, sumário com âncoras — inclusive `/termos#idade` —, atalhos para exportar/revogar/excluir, rodapé com contato do encarregado), central "Documentos legais" no Perfil › Sobre, "O que mudou nesta versão" no `/aceite` e os estados visitante / aceito / versão antiga aceita / sem internet, nos dois temas.
  2. Em paralelo, o jurídico redige os textos (dados reais do controlador e do encarregado, base legal, dados de saúde, transferência internacional, retenção). O design usa marcadores entre colchetes, nunca texto jurídico inventado.
  3. ~~Implementar as páginas estáticas e o leitor dentro do app~~ (feito em `feat/documentos-legais`). Falta publicar as versões definitivas por nova migration (versão e hash reais) e trocar o rascunho de `legal-content.ts` pelo texto do jurídico.

---

### Etapa 4 — Medidas corporais (módulo opcional)

**Branch:** `feat/medidas` · **Prioridade:** média

**Escopo**
- Portão de consentimento de saúde em camadas: resumo sempre visível (5 itens) + "Ler termo completo" + checkbox desmarcada + "Agora não" e "Autorizar e continuar" com o mesmo peso visual (`has_health_consent`, `grant_health_consent`).
- Registro de medidas (`body_measurements` + `measurement_values`) e evolução em gráfico.
- Revogar consentimento apaga as medidas (`revoke_health_consent`) — com aviso claro antes.

**Regras não negociáveis:** nunca enviar dados de medidas para logs, Sentry ou analytics.

**Decisões pendentes:** quais medidas entram (peso, % de gordura, circunferências); design no Claude Design.

---

### Etapa 5 — PWA instalável e offline do app

**Branch:** `feat/pwa` · **Prioridade:** média (uso na academia com sinal ruim)

**Andamento:** [x] manifesto e ícones (logo nova) · [x] service worker Serwist (pré-cache do app, abre offline; testado em navegador headless com o servidor desligado) · [x] aviso "Nova versão disponível" · [ ] teste de instalação em aparelhos reais (Android e iPhone) · [x] PR (#16)

**Escopo**
- Serwist: manifest, ícones, tela de instalação, cache do app (páginas estáticas e assets) para abrir sem internet.
- Integração com o offline existente (Dexie): treino em andamento e cópia do Histórico já funcionam sem rede.
- Aviso de nova versão disponível.

**Critério de aceite:** app instalado abre sem internet, retoma o treino em andamento e sincroniza a fila quando a conexão volta.

---

### Etapa 6 — Qualidade e lançamento

**Branch:** `chore/lancamento` (pode ser dividida)

- **Testes automatizados:** test runner para `packages/core` e `packages/api` (ex.: Vitest — **biblioteca nova, pedir aprovação**), convertendo os testes avulsos já feitos (relógio, unidades, 1RM, Histórico).
- **Monitoramento de erros** (ex.: Sentry — pedir aprovação), com filtro que impede dados de medidas e dados pessoais.
- **Hospedagem de produção:** Cloudflare Pages ou plano pago da Vercel; domínio próprio; Redirect URLs do Supabase para o domínio.
- **E-mail transacional próprio** (SMTP) para confirmação de cadastro e recuperação de senha.
- **Documentos legais definitivos** no banco (versões, URLs e hash reais) — substituir os provisórios do `seed.sql`. **Validação jurídica obrigatória.**
- **Revisão de acessibilidade** (WCAG AA) e de desempenho em celulares de entrada.

---

### Futuro (fora do MVP)

- App React Native (Expo) reaproveitando `packages/core`, `packages/api`, `packages/schemas` e `packages/types`.
- Login com Apple (junto com o app iOS).
- Planos pagos (`entitlements`, `is_premium()` já existem no banco).
- Esforço percebido (RPE): a coluna `set_logs.rpe` já existe, mas não é usada pelo app.
- Animações com Anime.js, Motion e React Bits (previstas na stack, ainda não instaladas).
- Iniciar treino sem internet (exigiria criar a sessão no aparelho e sincronizar depois).

## 3. Riscos e dependências

| Item | Tipo | Mitigação |
|---|---|---|
| Documentos legais provisórios | Jurídico | Revisão por advogado antes do lançamento; nova versão no banco força novo aceite (`/aceite`) |
| Dados de saúde (medidas) | Jurídico/LGPD | Consentimento específico, revogação que apaga os dados, nada em logs/analytics |
| Sem testes automatizados | Técnico | Etapa 6; até lá, testar regras do core a cada etapa |
| Trocar projeto ativo em duas gravações | Técnico | Resolvido: RPC `activate_project` (atômica) |
| Limites do plano gratuito (Supabase/Vercel) | Financeiro | Revisar uso antes de abrir para usuários; produção em Cloudflare Pages ou Vercel pago |
