# Histórico (seção da Início)

> Detalhes de implementação que saíram do `CLAUDE.md` (índice em "Funcionalidades: onde ler os detalhes").
> Ler inteiro antes de mexer nesta funcionalidade e atualizar no mesmo PR quando o código mudar.

## Histórico (seção da Início, âncora `/#historico`)
- **Na Início:** a aba Histórico saiu do menu; a Início mostra Treino de hoje, Esta semana e, abaixo, o `HistorySection` (sequência com a faixa de 12 semanas, título "Histórico" com a âncora `HISTORY_ANCHOR`, atalho de evolução, calendário e gráfico). O card de sequência é o do Histórico (o da Início foi removido). "Esta semana" rola até a âncora; tocar num dia da semana ou do calendário abre a MESMA folha do dia (estado na Início, `openDay`). `/historico` continua existindo só para redirecionar (`HistoryRedirect` → `/?mes=…&periodo=…#historico`), por causa de links e apps instalados antigos; links novos usam `historyAnchorPath()`.
- **Pasta:** `features/history/` (`ui/history-section.tsx`, `ui/history-redirect.tsx`, `helpers/paths.ts`, calendário/gráfico/folha do dia em `components/`, `api/use-history.ts`).
- **Dados:** `packages/api/src/history.ts` — `getHistoryOverview` (dias treinados das últimas 104 semanas + `get_streak()` + meta + unidade + data do 1º treino), `getTrainingDays` (mês do calendário) e `getDaySessions` (treinos do dia, com recordes). Mapeadores comuns com a Início em `packages/api/src/shared.ts`.
- **Regras puras:** `packages/core/src/history.ts` (grade do mês, tercis de volume, médias semanais, comparação de períodos, faixa de semanas, recorde de treino passado).
- **Sequência:** números SEMPRE do `get_streak()` (nunca recalcular no app). Faixa das últimas 12 semanas: preenchida se a semana teve ≥ 1 treino concluído; a semana atual sem treino fica "em risco" até sábado.
- **Calendário:** semana dom–sáb, do mês do 1º treino até o mês atual; 3 níveis de realce pelos tercis de volume das últimas 12 semanas (tokens `volume-1`, `volume-2`, `accent`); só dias treinados são tocáveis (abrem a folha do dia).
- **Gráfico:** "Volume médio por dia treinado" por semana (4 sem · 3 meses · 6 meses · 1 ano); média = dias treinados com volume > 0 (dia só de cardio conta como treino, não entra na média); semana sem treino é lacuna, nunca zero; média do período = média das semanas com treino; variação % vs. período anterior (alta em volt, queda em cor neutra). Menos de 2 semanas com volume → aviso "poucos dados".
- **Recordes do dia:** mesma regra do `finish_workout` — maior 1RM estimado do treino maior que o de todos os treinos concluídos ANTES dele (dias anteriores e, no mesmo dia, os que terminaram antes); primeira vez não gera recorde. Calculado com `get_exercise_history` (`best_e1rm_kg`) dos exercícios do dia (`sessionRecord1Rm`/`previousBest1Rm` em core/history.ts), só ao abrir a folha.
- **URL:** `/?mes=2026-10&periodo=3m` (mês futuro ou inválido → mês atual).
- **Offline:** `withDeviceCache` (`apps/web/src/shared/offline/device-cache.ts`, tabela `history` do Dexie) guarda a última resposta e mostra o banner "Sem conexão – mostrando o último histórico salvo".
- **Atualização:** finalizar/descartar treino chama `invalidateTrainingData` (`apps/web/src/shared/libs/query-keys.ts`) → Início e Histórico recarregam; o mesmo acontece quando a fila offline envia um treino finalizado sem internet.
- **Estados de desenvolvimento:** `/?estado=` (junto com os da Início) padrao · risco · recorde · novo · poucos · erro · carregando · offline · dia (combináveis).
