# Regras de negócio — Guf App

> Atualizado em 10/10/2026 · Reflete o código da branch `feat/historico`.
> Regras implementadas no banco valem para todos os apps (web e futuro mobile); regras do `packages/core` são compartilhadas.
> Plano das próximas etapas: [`implementation-plan.md`](./implementation-plan.md).

**Legenda de onde a regra vive:** **Banco** = `supabase/migrations/` (funções, gatilhos, restrições) ·
**Core** = `packages/core/src/` · **Schemas** = `packages/schemas/src/` · **API** = `packages/api/src/` · **Web** = `apps/web/src/`.

---

## 1. Conta, acesso e LGPD

| Regra | Onde |
|---|---|
| Cadastro por e-mail exige duas confirmações, ambas **desmarcadas** por padrão: "Tenho 18 anos ou mais" e "Li e aceito os Termos de Uso e a Política de Privacidade". O botão fica desabilitado até marcar as duas. | Web (`components/auth/signup-form.tsx`) |
| Cadastro: nome com 2 a 100 caracteres; senha com 8 a 72 caracteres (o medidor de força é só orientação). | Schemas (`auth.ts`) + Core (`password.ts`) |
| O aceite do cadastro é gravado pelo banco: os ids das versões **vigentes** de termos, privacidade e declaração de idade exibidas na tela vão nos metadados do cadastro, e o gatilho `handle_new_user` registra os aceites. Ids inválidos ou desatualizados são ignorados. | Banco (`handle_new_user`) |
| Perfil e plano gratuito são criados automaticamente no cadastro. | Banco |
| Login com Google: se houver documento obrigatório pendente (`pending_documents()`), o usuário vai para `/aceite` antes de usar o app. | Web (guarda de rotas) + Banco |
| Portão `/aceite`: mostra só as confirmações do que está pendente, sempre desmarcadas; o botão só habilita com todas marcadas; "Sair" tem o mesmo peso visual. Origem do aceite: `reaccept` (já aceitou antes), `signup_google` ou `signup_email`. | Web + Banco (`accept_documents`) |
| Uma nova versão de documento torna o aceite pendente de novo (o usuário volta ao `/aceite`). Aceitar versão desatualizada é recusado (erro 22023). | Banco |
| Conta Google com o mesmo e-mail confirmado de uma conta existente é vinculada pelo Supabase. | Supabase Auth |
| Ao sair da conta: tenta enviar as gravações pendentes; depois apaga do aparelho o cache de consultas, o treino ativo e os dados offline. | Web (`providers/auth-provider.tsx`) |
| A segurança dos dados é do banco (RLS): cada usuário só lê e grava os próprios registros. O app usa apenas a chave pública. | Banco |
| Dados de medidas corporais nunca vão para logs, Sentry ou analytics. *(Módulo de medidas ainda não implementado.)* | Regra de projeto |

## 2. Unidades, datas e formatação

| Regra | Onde |
|---|---|
| Peso **sempre em kg no banco**; a conversão para lb (1 lb = 0,45359237 kg) é só na exibição, conforme `profiles.weight_unit`. Exibição com até 1 casa; gravação em kg com 2 casas. | Core (`units.ts`) |
| Edição de carga: passo de 2,5 em kg e de 5 em lb; atalhos −2,5 / +1 / +2,5 na unidade exibida. | Web (`set-edit-sheet.tsx`, DS `QuickLoad`) |
| Datas de calendário (`performed_on`) são a **data local** do aparelho ("yyyy-MM-dd"), nunca a data UTC do banco. | Core (`dates.ts`) |
| Semana vai de **segunda a domingo**. | Core |
| Números em pt-BR (vírgula decimal, ponto de milhar); sinal de menos tipográfico (−) e "×" em carga × repetições. | Core (`format.ts`) |

## 3. Projetos e rotinas

| Regra | Onde |
|---|---|
| Projeto = grupo de rotinas; rotina = lista ordenada de exercícios planejados (séries, repetições alvo em texto livre como "10", "8-12" ou "falha", e descanso). | Banco |
| **No máximo um projeto ativo por usuário** (índice único). A troca é feita pela função `activate_project`, que desativa o atual e ativa o novo na mesma transação (nunca fica com dois ou nenhum por erro). Projeto arquivado ou de outro usuário não pode ser ativado (erro `GP001`). | Banco (`activate_project`) |
| **Treino de hoje (projeto ativo):** pelos dias da semana das rotinas (`routines.weekdays`, ISO 1 = segunda … 7 = domingo). Rotina marcada para hoje → é o treino de hoje (várias no mesmo dia: a primeira pela ordem; as demais em "Trocar rotina"). O projeto usa dias e nenhuma rotina é de hoje → **dia de descanso** + o próximo treino da semana ("Amanhã" ou "Qua, 14 out"). Nenhuma rotina com dia marcado → a próxima pela ordem (`position`) depois da última concluída, voltando para a primeira; sem histórico, a primeira. | Core (`schedule.ts`: `todayPlan`) |
| Rotina tem dias da semana opcionais; a tela avisa quando outra rotina do mesmo projeto já usa o dia (é permitido). | Banco (`routines.weekdays`) + Web |
| **Favoritos:** todo usuário tem um projeto padrão "Favoritos", criado no cadastro (ativo para usuário novo; para quem já existia, ativo só se não houvesse outro). Não existe rotina avulsa — rotinas sem outro projeto ficam nele. Não pode ser renomeado, arquivado nem excluído (pode ser ativado/desativado). | Banco (`is_favorites`, `handle_new_user`, `protect_favorites_project`) |
| Montar/editar rotina: nome obrigatório (até 100), projeto, dias, e pelo menos 1 exercício; cada exercício com séries 1–20, repetições alvo (texto livre até 20, ex.: "10", "8-12", "falha"), descanso 45 s a 3 min e observação opcional (até 500). Exercício novo entra com 3 × 10 e 90 s. | Schemas (`routines.ts`) + Core |
| Salvar a rotina grava tudo numa transação (`save_routine`); mudar de projeto põe a rotina no fim da lista do novo projeto. Trocar exercício mantém séries, repetições, descanso e observação. Sair com mudanças não salvas pede confirmação. | Banco + Web |
| Duração estimada da rotina = Σ séries × (40 s de execução + descanso), arredondada para múltiplos de 5 min; sem meta, 3 séries e 90 s. | Core (`workout.ts`) |
| Observação de exercício feita no treino é salva também na rotina e aparece nos próximos treinos dela. | API (`workout.ts`) |
| Ficar sem projeto ativo é permitido (desativar o atual); arquivar o projeto ativo também o desativa. | Regra de projeto (Etapa 1) |
| **Montar e editar projetos e rotinas exige internet** (não há fila offline para essas telas). Sem conexão, as ações de edição ficam bloqueadas com o aviso "Sem conexão – para criar ou editar rotinas, conecte-se à internet."; o que já foi carregado continua visível. | Regra de projeto (Etapa 1) |
| Lista de projetos: o ativo em destaque; os demais em uso (mais recentes primeiro); arquivados numa seção recolhível (arquivados mais recentemente primeiro). | Core (`groupProjects`) |
| Ativar outro projeto quando já existe um ativo pede confirmação ("O projeto 'X' deixa de ser o ativo…"). Criar projeto pode já ativá-lo (padrão: ativar quando não há projeto ativo). | Web (`project-flows.tsx`, `project-form-sheet.tsx`) |
| Arquivar projeto ou rotina nunca apaga treinos feitos (o treino guarda o nome da rotina). Projeto arquivado pode ser restaurado (volta inativo). | Banco + API |
| Ativar, desativar, arquivar, restaurar e arquivar rotina oferecem "Desfazer" por 4 s (desfazer a ativação volta para o ativo anterior, ou para nenhum). | Web (`use-project-actions.ts`) |
| Nova rotina entra no fim da lista; reordenar grava posições sequenciais (1, 2, 3…), só das que mudaram. | Core (`nextPosition`, `changedPositions`) + API |
| Nome de projeto e de rotina: 1 a 100 caracteres; descrição do projeto: até 500 (opcional). | Schemas (`projects.ts`) |
| No projeto ativo, a rotina sugerida aparece como "Hoje" (ou "Próximo", se já treinou hoje). | Core (`suggestedRoutine`) |
| Nova rotina e edição dos exercícios na tela de Rotina (`/rotina`); a folha de Projetos só renomeia. | Web |

## 4. Treino

### 4.1 Iniciar e retomar

| Regra | Onde |
|---|---|
| **Um treino em andamento por vez** (o banco recusa o segundo). Com treino aberto, "Treinar" e "Iniciar treino" oferecem só retomar. | Banco + Web |
| Ao abrir o app com treino aberto, a Início mostra o card em destaque e o mini card flutuante (sem redirecionar). | Web (`app-shell.tsx`) |
| Iniciar cria a sessão com o nome da rotina como snapshot (ou "Treino livre") e copia os exercícios planejados. Se a cópia falhar, a sessão criada é apagada. | API (`home.ts`) |
| **Séries planejadas ao iniciar:** quantidade = séries da rotina (sem meta: as do último desempenho, mínimo 3); carga e repetições do último desempenho do exercício ou, sem histórico, o mínimo das repetições alvo. | API (`home.ts`) |
| Exercício adicionado durante o treino: séries do último desempenho, recorde atual e descanso da rotina (padrão 90 s). Sem internet: 3 séries vazias. | Web (`workout-builders.ts`) |
| Trocar exercício = apagar o exercício do treino e criar outro, mantendo número e tipo das séries. | API + Web |
| Remover exercício pode ser desfeito por 4 s; só depois a remoção é gravada. | Web |
| Iniciar treino exige internet. | Limitação atual |

### 4.2 Séries

| Regra | Onde |
|---|---|
| Tipos de série: normal, aquecimento, drop-set e falha (toque no tipo alterna nessa ordem). | Web (`workout-state.ts`) |
| Nova série copia carga e repetições da última série do exercício (padrão 10 repetições). | Web |
| **Só conta o que foi concluído.** Série não concluída não entra em volume, contagem, histórico nem recorde. | Core + Banco |
| Ao finalizar, o banco **apaga as séries não concluídas** e os exercícios que ficaram sem séries, antes de calcular o resumo e os recordes. | Banco (`finish_workout`) |
| Aquecimento nunca conta para volume, contagem de séries, 1RM ou recorde. | Core + Banco |
| A coluna "anterior" mostra a série equivalente do último treino concluído do exercício. | Banco (`get_last_performance`) |

### 4.3 Tempo de treino

| Regra | Onde |
|---|---|
| `started_at` e `finished_at` guardam início e fim; o **tempo efetivo** é a soma dos períodos em que o treino estava rodando (`workout_active_periods`), sem as pausas. | Banco |
| Pode haver várias pausas; no máximo um período aberto por treino. Pausar e retomar são idempotentes e o servidor limita o horário informado (nunca no futuro nem antes do início). | Banco (`pause_workout`, `resume_workout`) |
| A duração exibida é sempre a efetiva (`active_seconds`); treinos antigos sem esse campo usam fim − início. | API (`shared.ts`) |
| Pausar o treino também pausa o descanso em andamento. | Web (`workout-provider.tsx`) |

### 4.4 Finalizar e descartar

| Regra | Onde |
|---|---|
| Finalizar (online e sem pendências) usa `finish_workout`: fecha o período aberto, grava o tempo efetivo e devolve resumo e recordes oficiais. | Banco + Web |
| Finalizar sem internet: o treino fica salvo no aparelho, o resumo é calculado no aparelho com as mesmas regras e é enviado quando a conexão volta. | Web (`lib/offline/`) |
| Descartar apaga o treino e as gravações pendentes dele. | Web + API |
| Finalizar ou descartar atualiza a Início e o Histórico (também quando a fila offline envia depois). | Web (`lib/query-keys.ts`) |

### 4.5 Offline do treino em andamento

| Regra | Onde |
|---|---|
| Toda alteração aparece na hora e entra numa fila no aparelho, enviada em ordem quando há internet (ao reconectar, ao voltar para o app e a cada 20 s). | Web (`lib/offline/outbox.ts`) |
| Ids de exercícios, séries e exercícios criados são gerados no aparelho: reenviar não duplica. | Web + API |
| Sem internet ou sessão expirada: a fila espera. Outros erros: até 5 tentativas; depois a alteração é descartada e o usuário é avisado. | Web |

## 5. Cálculos e recordes

| Regra | Onde |
|---|---|
| **Volume** = Σ carga × repetições das séries concluídas, sem aquecimento. | Core (`workout.ts`) + Banco |
| **Séries** (no resumo) = séries concluídas, sem aquecimento. | Core + Banco |
| **1RM estimado** (Epley) = carga × (1 + repetições / 30), arredondado a 1 casa, com o mesmo arredondamento do Postgres. Aquecimentos não contam. | Core (`training.ts`) + Banco |
| **Recorde de carga:** carga maior que a maior carga de todos os treinos concluídos anteriores do exercício. Empate não é recorde. | Core (`records.ts`, `session.ts`) + Banco |
| **Primeira vez de um exercício não gera recorde.** | Core + Banco |
| No treino, o recorde só aparece **ao concluir** a série; várias séries no mesmo treino podem bater recorde em sequência (cada uma vira a nova referência). | Core (`markLoadRecords`) |
| Recordes de um treino passado (folha do dia no Histórico): comparam com os treinos concluídos antes dele — dias anteriores e, no mesmo dia, os que terminaram antes. | Core (`sessionLoadRecord`) + API (`history.ts`) |
| O resumo do `finish_workout` também retorna recorde de 1RM estimado; o app exibe só o de carga máxima. | Banco + API |

## 6. Sequência de semanas (streak)

| Regra | Onde |
|---|---|
| Uma semana (seg–dom) conta quando tem **pelo menos 1 treino concluído**; treinar mais vezes não aumenta a sequência. | Banco (`get_streak`) |
| Uma semana inteira sem treino **zera** a sequência. | Banco |
| A semana atual ainda sem treino **não zera**: fica "em risco" até domingo. | Banco |
| A meta semanal (`weekly_goal`, 1 a 7) é **só exibição** ("X de Y treinos da sua meta") e não afeta a sequência. | Banco + Core |
| Os números da sequência vêm **sempre** do `get_streak()`; o app não recalcula. | Web |
| Textos: número + "semanas" / "seguidas treinando"; semana garantida → "Semana garantida" + ícone de check + meta; em risco → "Nenhum treino nesta semana ainda. Treine até domingo para manter sua sequência."; zerada ou usuário novo → "Treine 1 vez até domingo e comece sua sequência."; destaque dourado quando a atual é o recorde (e maior que zero). | Core (`home.ts`: `STREAK_MESSAGES`, `streakWords`, `weeklyGoalLabel`) |

## 7. Tela Início

| Regra | Onde |
|---|---|
| Saudação pela hora local: 5h–11h "Bom dia", 12h–17h "Boa tarde", demais "Boa noite", com o primeiro nome. | Core (`home.ts`) |
| Card "Treino de hoje", em ordem de prioridade: em andamento > concluído hoje > treino de hoje do projeto ativo (pelos dias) **ou** dia de descanso com o próximo treino da semana > sem plano (tem rotinas, sem projeto ativo) > usuário novo (nenhuma rotina). | Web (`home-screen.tsx`, `today-card.tsx`) |
| Card "Esta semana": dias treinados de segunda a domingo e contagem vs. meta. | Web + Banco (`get_training_days`) |

## 8. Histórico

| Regra | Onde |
|---|---|
| Faixa das últimas 12 semanas: semana preenchida quando teve ≥ 1 treino concluído; a atual é destacada. | Core (`history.ts`) |
| Calendário: semana seg–dom, do mês do primeiro treino até o mês atual; só dias treinados abrem detalhes. | Web + Core |
| Realce do dia em 3 níveis, pelos tercis de volume dos dias treinados das últimas 12 semanas (menos de 3 dias com volume → nível mais claro para todos). | Core |
| Resumo do mês: treinos, dias treinados e volume. | Core |
| Gráfico "Volume médio por dia treinado", por semana, nos períodos 4 semanas, 3 meses, 6 meses e 1 ano. | Core + Web |
| Média da semana considera só **dias treinados com volume** (um dia só de cardio conta como treino, mas não entra na média). Semana sem treino é **lacuna**, nunca zero. | Core |
| Média do período = média das semanas com treino. Variação % = comparação com o período anterior de mesmo tamanho (sem dados → "Sem dados do período anterior"). Alta em verde; queda em cor neutra (queda não é erro). | Core + Web |
| Menos de 2 semanas com volume em todo o histórico → aviso "Treine mais algumas semanas para ver sua evolução." | Core + Web |
| Sem internet, mostra a última cópia salva no aparelho com aviso. | Web (`lib/offline/device-cache.ts`) |

## 9. Mensagens ao usuário

| Regra | Onde |
|---|---|
| Toda mensagem de erro diz **o que aconteceu e como resolver**, em português. | API (`result.ts`) |
| Erros padronizados: treino já em andamento, treino não encontrado/finalizado, sessão expirada, sem conexão e erro desconhecido. | API (`result.ts`) |

## 10. Pontos em aberto (decisões de produto)

- Quais medidas corporais entram no módulo de medidas.
- Uso do esforço percebido (RPE): a coluna existe no banco, sem uso no app.
- Exibir também o recorde de 1RM estimado no resumo do treino (o banco já calcula).
