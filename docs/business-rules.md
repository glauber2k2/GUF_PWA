# Regras de negócio — Guf App

# 0. Informações

Este documento tem como finalidade listar as regras de negócio em vigor e onde cada uma está implementada.

| Feito por | Glauber |
| --- | --- |
| Data de Criação | 10/10/2026 |

> Atualizado em 11/10/2026 · Reflete o código da `main` (até o PR #23).
> Regras implementadas no banco valem para todos os apps (web e futuro mobile); regras do `packages/core` são compartilhadas.
> Plano das próximas etapas: [`implementation-plan.md`](./implementation-plan.md).

**Legenda de onde a regra vive:** **Banco** = `supabase/migrations/` (funções, gatilhos, restrições) ·
**Core** = `packages/core/src/` · **Schemas** = `packages/schemas/src/` · **API** = `packages/api/src/` · **Web** = `apps/web/src/`
(`features/<feature>/` para o que é de uma tela, `shared/` para o que é comum; ver [`architecture.md`](./architecture.md)).

---

## 1. Conta, acesso e LGPD

| Regra | Onde |
|---|---|
| Cadastro por e-mail exige duas confirmações, ambas **desmarcadas** por padrão: "Tenho 18 anos ou mais" e "Li e aceito os Termos de Uso e a Política de Privacidade". O botão fica desabilitado até marcar as duas. | Web (`features/auth/ui/signup-form.tsx`) |
| Cadastro: nome com 2 a 100 caracteres; senha com 8 a 72 caracteres (o medidor de força é só orientação). | Schemas (`auth.ts`) + Core (`password.ts`) |
| O aceite do cadastro é gravado pelo banco: os ids das versões **vigentes** de termos, privacidade e declaração de idade exibidas na tela vão nos metadados do cadastro, e o gatilho `handle_new_user` registra os aceites. Ids inválidos ou desatualizados são ignorados. | Banco (`handle_new_user`) |
| Perfil e plano gratuito são criados automaticamente no cadastro. | Banco |
| Login com Google: se houver documento obrigatório pendente (`pending_documents()`), o usuário vai para `/aceite` antes de usar o app. | Web (guarda de rotas) + Banco |
| Portão `/aceite`: mostra só as confirmações do que está pendente, sempre desmarcadas; o botão só habilita com todas marcadas; "Sair" tem o mesmo peso visual. Origem do aceite: `reaccept` (já aceitou antes), `signup_google` ou `signup_email`. | Web + Banco (`accept_documents`) |
| Uma nova versão de documento torna o aceite pendente de novo (o usuário volta ao `/aceite`). Aceitar versão desatualizada é recusado (erro 22023). | Banco |
| **Registro de consentimentos fechado:** o app só lê `consent_records`. Aceites, autorização e revogação de saúde são gravados apenas pelas funções do banco, que recusam origem (`signup_email`, `signup_google`, `reaccept`) ou plataforma (`web`, `ios`, `android`) fora da lista (erro 22023). Nada é editado ou apagado; revogar = novo registro. | Banco (`accept_documents`, `grant_health_consent`, `revoke_health_consent`) |
| **Prova após excluir a conta:** antes de apagar o usuário, o banco copia os aceites para `consent_proofs` (documento, versão, hash do texto, ação, origem, data e o e-mail só em SHA-256; nenhum outro dado). Guardada por 5 anos (prazo a validar com o jurídico) e apagada por job diário. Sem acesso pelo app. | Banco (gatilho `on_auth_user_deleted_preserve_consents`, job `purge-expired-consent-proofs`) |
| **Hash dos textos legais:** `content_hash`/`summary_hash` de cada versão = SHA-256 do texto exibido no app. Mudou o texto → nova versão por migration, publicada junto com o app. Em desenvolvimento, `/documentos` avisa se o hash do banco não confere. | Core (`legal-hash.ts`) + Banco |
| **Registro de auditoria:** o banco registra em `audit_log` (sem acesso pelo app) cada aceite e revogação, medidas apagadas, exportação de dados e exclusão de conta, só com id interno, tipo do evento e contagens. Não dá para editar nem apagar (exceto a eliminação automática após 5 anos); a integridade é conferida por cadeia de hash. | Banco (`audit_log`, `verify_audit_log`) |
| Conta Google com o mesmo e-mail confirmado de uma conta existente é vinculada pelo Supabase. | Supabase Auth |
| Ao sair da conta: tenta enviar as gravações pendentes; depois apaga do aparelho o cache de consultas, o treino ativo e os dados offline. | Web (`features/auth/providers/auth-provider.tsx`) |
| A segurança dos dados é do banco (RLS): cada usuário só lê e grava os próprios registros. O app usa apenas a chave pública. | Banco |
| Dados de medidas corporais nunca vão para logs, Sentry ou analytics. *(Módulo de medidas ainda não implementado.)* | Regra de projeto |

## 2. Unidades, datas e formatação

| Regra | Onde |
|---|---|
| Peso **sempre em kg no banco**; a conversão para lb (1 lb = 0,45359237 kg) é só na exibição, conforme `profiles.weight_unit`. Exibição com até 1 casa; gravação em kg com 2 casas. | Core (`units.ts`) |
| Edição de carga: passo de 2 em kg e de 5 em lb; atalhos −1 / +1 / +5 / +10 na unidade exibida (somam). Repetições: atalhos 6 / 8 / 10 / 12 / 15 (substituem o valor). No teclado numérico, o valor atual aparece destacado e o primeiro dígito o substitui, sem precisar apagar. | Web (`set-edit-sheet.tsx`, DS `QuickLoad`, `QuickReps`, `NumericKeypad replaceOnFirstKey`) |
| Datas de calendário (`performed_on`) são a **data local** do aparelho ("yyyy-MM-dd"), nunca a data UTC do banco. | Core (`dates.ts`) |
| Semana vai de **domingo a sábado** (calendários, sequência, meta semanal, dias da rotina e imagens de compartilhamento). | Core (`dates.ts`) + Banco (`get_streak`) |
| Números em pt-BR (vírgula decimal, ponto de milhar); sinal de menos tipográfico (−) e "×" em carga × repetições. | Core (`format.ts`) |

## 3. Projetos e rotinas

| Regra | Onde |
|---|---|
| Projeto = grupo de rotinas; rotina = lista ordenada de exercícios planejados (séries, repetições alvo em texto livre como "10", "8-12" ou "falha", e descanso). | Banco |
| **No máximo um projeto ativo por usuário** (índice único). A troca é feita pela função `activate_project`, que desativa o atual e ativa o novo na mesma transação (nunca fica com dois ou nenhum por erro). Projeto arquivado ou de outro usuário não pode ser ativado (erro `GP001`). | Banco (`activate_project`) |
| **Treino de hoje (projeto ativo):** pelos dias da semana das rotinas (`routines.weekdays`, ISO 1 = segunda … 7 = domingo no banco; exibidos de domingo a sábado). Rotina marcada para hoje → é o treino de hoje (várias no mesmo dia: a primeira pela ordem; as demais em "Trocar rotina"). O projeto usa dias e nenhuma rotina é de hoje → **dia de descanso** + o próximo treino da semana ("Amanhã" ou "Qua, 14 out"). Nenhuma rotina com dia marcado → a próxima pela ordem (`position`) depois da última concluída, voltando para a primeira; sem histórico, a primeira. | Core (`schedule.ts`: `todayPlan`) |
| Rotina tem dias da semana opcionais; a tela avisa quando outra rotina do mesmo projeto já usa o dia (é permitido). | Banco (`routines.weekdays`) + Web |
| **Favoritos:** todo usuário tem um projeto padrão "Favoritos", criado no cadastro (ativo para usuário novo; para quem já existia, ativo só se não houvesse outro). Não existe rotina avulsa — rotinas sem outro projeto ficam nele. Não pode ser renomeado, arquivado nem excluído (pode ser ativado/desativado). | Banco (`is_favorites`, `handle_new_user`, `protect_favorites_project`) |
| Montar/editar rotina: nome obrigatório (até 100), projeto, dias, e pelo menos 1 exercício; cada exercício com séries 1–20, repetições alvo (texto livre até 20, ex.: "10", "8-12", "falha"), descanso 45 s a 3 min e observação opcional (até 500). Exercício novo entra com 3 × 10 e 90 s. | Schemas (`routines.ts`) + Core |
| Salvar a rotina grava tudo numa transação (`save_routine`); mudar de projeto põe a rotina no fim da lista do novo projeto. Trocar exercício mantém séries, repetições, descanso e observação. Enquanto grava aparece "Salvando rotina"; depois de salvar, o app volta para o projeto da rotina. Sair com mudanças não salvas pede confirmação. | Banco + Web |
| Duração estimada da rotina = Σ séries × (40 s de execução + descanso), arredondada para múltiplos de 5 min; sem meta, 3 séries e 90 s. | Core (`workout.ts`) |
| Observação de exercício feita no treino é salva também na rotina e aparece nos próximos treinos dela. | API (`workout.ts`) |
| Ficar sem projeto ativo é permitido (desativar o atual); arquivar o projeto ativo também o desativa. | Regra de projeto (Etapa 1) |
| **Montar e editar projetos e rotinas exige internet** (não há fila offline para essas telas). Sem conexão, as ações de edição ficam bloqueadas com o aviso "Sem conexão – para criar ou editar rotinas, conecte-se à internet."; o que já foi carregado continua visível. | Regra de projeto (Etapa 1) |
| Lista de projetos: o ativo em destaque; os demais em uso (mais recentes primeiro); arquivados numa seção recolhível (arquivados mais recentemente primeiro). | Core (`groupProjects`) |
| Ativar outro projeto quando já existe um ativo pede confirmação ("O projeto 'X' deixa de ser o ativo…"). Criar projeto pode já ativá-lo (padrão: ativar quando não há projeto ativo). | Web (`project-flows.tsx`, `project-form-sheet.tsx`) |
| Arquivar projeto ou rotina nunca apaga treinos feitos (o treino guarda o nome da rotina). Projeto arquivado pode ser restaurado (volta inativo). | Banco + API |
| **Excluir projeto:** permitido para qualquer projeto, exceto o Favoritos (pelo menu do projeto ou na lista de arquivados). Exclui junto as rotinas e os exercícios planejados; os treinos já feitos continuam no histórico. Pede confirmação ("As N rotinas deste projeto também serão excluídas… Não dá para desfazer.") e não tem "Desfazer". Excluir o projeto ativo deixa o usuário sem projeto ativo. | Banco (`on delete cascade`, `protect_favorites_project`) + Web |
| Ativar, desativar, arquivar, restaurar e arquivar rotina oferecem "Desfazer" por 4 s (desfazer a ativação volta para o ativo anterior, ou para nenhum). | Web (`use-project-actions.ts`) |
| Nova rotina entra no fim da lista; reordenar grava posições sequenciais (1, 2, 3…), só das que mudaram. | Core (`nextPosition`, `changedPositions`) + API |
| Nome de projeto e de rotina: 1 a 100 caracteres; descrição do projeto: até 500 (opcional). | Schemas (`projects.ts`) |
| No projeto ativo, a rotina sugerida aparece como "Hoje" (ou "Próximo", se já treinou hoje). | Core (`suggestedRoutine`) |
| Nova rotina e edição dos exercícios na tela de Rotina (`/rotina`); a folha de Projetos só renomeia. "Criar minha primeira rotina" (Início) e "Montar uma rotina" (Iniciar treino) criam a rotina direto no projeto ativo (para usuário novo, o Favoritos); sem projeto ativo, levam à lista de Projetos. | Web |

## 4. Treino

### 4.1 Iniciar e retomar

| Regra | Onde |
|---|---|
| **Um treino em andamento por vez** (o banco recusa o segundo). Com treino aberto, "Treinar" e "Iniciar treino" oferecem só retomar. | Banco + Web |
| Ao abrir o app com treino aberto, a Início mostra o card em destaque e o mini card flutuante (sem redirecionar). | Web (`app-shell.tsx`) |
| Iniciar cria a sessão com o nome da rotina como snapshot (ou "Treino livre") e copia os exercícios planejados. Se a cópia falhar, a sessão criada é apagada. | API (`home.ts`) |
| **Séries planejadas ao iniciar:** quantidade = séries da rotina (sem meta: as do último desempenho, mínimo 3). Carga e repetições conforme a opção da rotina "Atualizar carga e repetições automaticamente" (padrão ligada): ligada = último desempenho do exercício ou, sem histórico, o mínimo das repetições alvo; desligada = carga planejada na rotina e o mínimo das repetições alvo, ou vazio. | Core (`plannedSetValues`) + API (`startWorkout`) |
| **Atualizar a rotina ao finalizar** (só treino iniciado por rotina): depois de confirmar "Finalizar", o app pergunta se a rotina deve virar este treino. Sim: exercícios na ordem do treino; séries = concluídas sem aquecimento; repetições = valor único ou faixa ("8-12"); carga planejada = a maior; descanso e observação dos exercícios que já estavam na rotina continuam. Sem internet, vai junto com a finalização na fila. | Banco (`update_routine_from_workout`) + Web (`workout-screen.tsx`, `outbox.ts`) |
| Exercício adicionado durante o treino: séries do último desempenho, recorde atual e descanso da rotina (padrão 90 s). Sem internet: 3 séries vazias. | Web (`workout-builders.ts`) |
| Trocar exercício = apagar o exercício do treino e criar outro, mantendo número e tipo das séries. | API + Web |
| Remover exercício pode ser desfeito por 4 s; só depois a remoção é gravada. | Web |
| Segurar o cabeçalho de um exercício permite reordenar; soltar salva a ordem e encerra o gesto, Esc/cancelamento sai sem gravar. Cards abertos ou fechados impedem seleção e menu de copiar texto; durante o arraste essas ações também ficam bloqueadas fora do card. | Web (`use-hold-reorder.ts` + `workout-exercise-card.tsx`) |
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
| Finalizar sem internet: o treino fica salvo no aparelho, o resumo é calculado no aparelho com as mesmas regras e é enviado quando a conexão volta. | Web (`shared/offline/`) |
| Descartar apaga o treino e as gravações pendentes dele. | Web + API |
| Finalizar ou descartar atualiza a Início e o Histórico (também quando a fila offline envia depois). | Web (`shared/libs/query-keys.ts`) |

### 4.5 Offline do treino em andamento

| Regra | Onde |
|---|---|
| Toda alteração aparece na hora e entra numa fila no aparelho, enviada em ordem quando há internet (ao reconectar, ao voltar para o app e a cada 20 s). | Web (`shared/offline/outbox.ts`) |
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
| No treino, o recorde só aparece **ao concluir** a série e fica em **uma série por exercício**: a de maior carga do treino (a primeira, em caso de empate), se passar do recorde anterior. Bateu de novo numa série seguinte? O recorde passa para ela (igual ao `finish_workout`). A série com recorde mostra o troféu dourado com brilho no botão de concluir. | Core (`markLoadRecords`), DS `SetRow` |
| Recordes de um treino passado (folha do dia no Histórico): comparam com os treinos concluídos antes dele — dias anteriores e, no mesmo dia, os que terminaram antes. | Core (`sessionLoadRecord`) + API (`history.ts`) |
| O resumo do `finish_workout` também retorna recorde de 1RM estimado; o app exibe só o de carga máxima. | Banco + API |

## 6. Sequência de semanas (streak)

| Regra | Onde |
|---|---|
| Uma semana (dom–sáb) conta quando tem **pelo menos 1 treino concluído**; treinar mais vezes não aumenta a sequência. | Banco (`get_streak`) |
| Uma semana inteira sem treino **zera** a sequência. | Banco |
| A semana atual ainda sem treino **não zera**: fica "em risco" até sábado. | Banco |
| A meta semanal (`weekly_goal`, 1 a 7) é **só exibição** ("X de Y treinos da sua meta") e não afeta a sequência. | Banco + Core |
| Os números da sequência vêm **sempre** do `get_streak()`; o app não recalcula. | Web |
| Textos: número + "semanas" / "seguidas treinando"; semana garantida → "Semana garantida" + ícone de check + meta; em risco → "Nenhum treino nesta semana ainda. Treine até sábado para manter sua sequência."; zerada ou usuário novo → "Treine 1 vez até sábado e comece sua sequência."; destaque dourado quando a atual é o recorde (e maior que zero). | Core (`home.ts`: `STREAK_MESSAGES`, `streakWords`, `weeklyGoalLabel`) |

## 7. Tela Início

| Regra | Onde |
|---|---|
| Saudação pela hora local: 5h–11h "Bom dia", 12h–17h "Boa tarde", demais "Boa noite", com o primeiro nome. | Core (`home.ts`) |
| Card "Treino de hoje", em ordem de prioridade: em andamento > concluído hoje > treino de hoje do projeto ativo (pelos dias) **ou** dia de descanso com o próximo treino da semana > sem plano (tem rotinas, sem projeto ativo) > usuário novo (nenhuma rotina). | Web (`home-screen.tsx`, `today-card.tsx`) |
| Card "Esta semana": dias treinados de domingo a sábado e contagem vs. meta. | Web + Banco (`get_training_days`) |

## 8. Histórico (seção da Início)

O histórico fica na Início, abaixo de "Esta semana" (menu com 5 abas). "Esta semana" rola até ele e os dias da semana abrem a mesma folha do dia do calendário; `/historico` só redireciona para `/#historico`.

| Regra | Onde |
|---|---|
| Faixa das últimas 12 semanas: semana preenchida quando teve ≥ 1 treino concluído; a atual é destacada. | Core (`history.ts`) |
| Calendário: semana dom–sáb, do mês do primeiro treino até o mês atual; só dias treinados abrem detalhes. | Web + Core |
| Realce do dia em 3 níveis, pelos tercis de volume dos dias treinados das últimas 12 semanas (menos de 3 dias com volume → nível mais claro para todos). | Core |
| Resumo do mês: treinos, dias treinados e volume. | Core |
| Gráfico "Volume médio por dia treinado", por semana, nos períodos 4 semanas, 3 meses, 6 meses e 1 ano. | Core + Web |
| Média da semana considera só **dias treinados com volume** (um dia só de cardio conta como treino, mas não entra na média). Semana sem treino é **lacuna**, nunca zero. | Core |
| Média do período = média das semanas com treino. Variação % = comparação com o período anterior de mesmo tamanho (sem dados → "Sem dados do período anterior"). Alta em verde; queda em cor neutra (queda não é erro). | Core + Web |
| Menos de 2 semanas com volume em todo o histórico → aviso "Treine mais algumas semanas para ver sua evolução." | Core + Web |
| Sem internet, mostra a última cópia salva no aparelho com aviso. | Web (`shared/offline/device-cache.ts`) |

## 8.1 Resumo do treino e evolução por exercício

| Regra | Onde |
|---|---|
| Resumo: duração efetiva (sem pausas), volume e séries com a mesma regra da Início/Histórico (séries concluídas, sem aquecimento); linha "Tempo efetivo · N pausas · m:ss parado" quando houve pausa (pausas = períodos ativos − 1). | Core (`evolution.ts`) + API |
| Recordes do treino: carga máxima maior que a de todos os treinos concluídos ANTES (dias anteriores e, no mesmo dia, os que terminaram antes); primeira vez não gera recorde. A série marcada é a de mais repetições com a carga do recorde. | Core (`sessionLoadRecord`, `recordSetIndex`) + API |
| Dia com vários treinos: "Ver resumo" abre o mais recente; o cabeçalho mostra discretamente a posição no dia ("1/2", "2/2", pela ordem de término). Ao excluir um deles, a tela mostra o mais recente que sobrou; excluído o último do dia, sai da tela. | API (`daySessionIds`) + Web |
| A lista de exercícios mostra só séries concluídas (aquecimento, drop set e falha identificados por letra). | API + Web |
| Excluir treino: só treino concluído, só com internet e sem gravações pendentes na fila; confirmação com "Cancelar" e "Excluir" de mesmo peso. Séries, exercícios e pausas saem junto; calendário, sequência, recordes e evolução se recalculam (o banco calcula tudo a partir dos treinos existentes). | API (`deleteWorkout`) + Banco (cascade) + Web |
| Evolução: um ponto por treino; métricas carga máxima, 1RM estimado (Epley) e volume; períodos 3 meses, 6 meses, 1 ano e tudo; variação = último − primeiro do período (alta em volt, queda neutra); tendência por mínimos quadrados. | Core (`evolution.ts`) |
| Recordes pessoais do exercício: maior carga (empate → mais repetições), melhor 1RM estimado e maior volume num treino; tocar abre o treino em que foi feito. Com 1 treino só, os cartões ficam neutros ("Recordes contam a partir do segundo treino"). | Core + Web |
| Números da evolução vêm do `get_exercise_history` (mesma regra do banco); o app só completa as repetições da melhor série e a série do melhor 1RM. | API |
| Busca "Ver evolução de um exercício": só exercícios já feitos em treinos concluídos, mais recentes primeiro, com busca sem acento e filtro por grupo muscular. | Core (`filterTrainedExercises`) + API |
| Busca de exercícios (seletor do treino/rotina e "Ver evolução") é flexível: cada pedaço digitado precisa aparecer no nome, em qualquer ordem e sem acento ("elev lat" → Elevação lateral, "su reto" → Supino reto); o seletor também busca pelo equipamento. Mais parecidos primeiro (início de palavra vale mais). | Core (`searchScore`, `searchFilter` em session.ts) |
| Sem internet, resumo, evolução e busca abrem com a última cópia salva no aparelho; um treino finalizado offline e ainda não enviado mostra o resumo calculado no aparelho, sem a opção de excluir. | Web |

## 8.2 Perfil

| Regra | Onde |
|---|---|
| Alterar nome, unidade de peso e meta semanal **exige internet**; sem conexão, aviso "Sem conexão – para alterar seu perfil, conecte-se à internet." Instalar o app, trocar o tema e sair funcionam sem internet. | Web (`features/profile/`) |
| Meta semanal: toques rápidos em + / − mudam o número na hora, mas geram **uma** gravação (o último valor, 600 ms após o último toque; nunca duas ao mesmo tempo; voltar ao valor salvo não grava). | Core (`coalesce.ts`) + Web (`useCoalescedSave`) |
| Nome: 1 a 100 caracteres (espaços nas pontas são removidos). Meta semanal: 1 a 7, só exibição (a sequência conta com 1 treino por semana). | Schemas (`profile.ts`) |
| Unidade kg/lb muda **só a exibição**; o banco guarda sempre kg. Alterações do perfil atualizam Perfil, Início e Histórico. | Web + Banco |
| Tema Escuro/Claro/Sistema é salvo **no aparelho** (não vai para o banco) e aplicado antes da primeira pintura. | Web (`shared/preferences/theme.ts`) |
| "Treinando desde mmm aaaa · N treinos" usa o primeiro treino concluído; sem treino → "Nenhum treino concluído ainda". | Core (`profile.ts`) |
| Foto do usuário (Perfil e Início): foto enviada pelo usuário (futuro upload; vale para login social e e-mail/senha) > foto atual da conta Google > foto do Google guardada no cadastro > inicial do nome. Se a foto não carregar (sem internet), aparece a inicial. | Core (`avatar.ts`) + API (`resolveAvatarUrl`) + Web (`Avatar`) |
| Instalar: Android/Chromium com convite → convite nativo; iPhone no Safari → 3 passos; iPhone em outro navegador → "Copiar link" (só o Safari instala no iPhone); já instalado → cartão "App instalado"; demais → passos pelo menu do navegador. | Core (`pwa.ts`) + Web |
| Exportar meus dados: JSON da `export_my_data()` (formato `guf-export/3`: conta, contas vinculadas, perfil, treinos, períodos ativos, séries, rotinas, medidas, perfil social, vínculos, bloqueios e consentimentos; sem senha, tokens ou sessões) gerado no aparelho, arquivo `guf-meus-dados-AAAA-MM-DD.json` (data local). O conteúdo nunca vai para logs. | Banco + API + Core + Web |
| Outros pedidos sobre dados (correção do e-mail, oposição, revisão de decisão automatizada etc.): "Outros pedidos sobre seus dados" em Perfil › Privacidade abre o e-mail do canal (`PRIVACY_CONTACT_EMAIL`, provisório do beta) com o assunto pronto; resposta em até 15 dias. | Core (`legal-content.ts`) + Web (`privacy-section.tsx`) |
| Documentos aceitos: o último aceite de cada documento (data e versão); o consentimento de saúde só aparece se estiver ativo. | API (`getConsents`) |
| Revogar consentimento de saúde apaga **todas** as medidas; confirmação com "Cancelar" e "Revogar" de mesmo peso visual. | Banco (`revoke_health_consent`) + Web |
| Excluir conta: confirmação digitando **EXCLUIR**, com atalho para exportar antes; chama a Edge Function `delete-account`, sai da conta (o aparelho é limpo) e abre o login com "Sua conta foi excluída." | API + Web |
| Sair com gravações de treino ainda não enviadas: confirmação com "Ficar" e "Sair mesmo assim" de mesmo peso visual. | Web (`profile-sign-out.tsx`) |

## 8.3 Perfil social, seguidores e competição

| Regra | Onde |
|---|---|
| Toda conta tem um perfil social **privado** com @ aleatório (`guf.xxxxxx`), criado no cadastro e editável em "Editar perfil" (3–20 caracteres: minúsculas, números, ponto, _; sem começar ou terminar com ponto ou _; único). | Banco (`social_profiles`, `random_social_handle`, `update_social_handle`) + Core/Schemas (`social.ts`) |
| O cartão do perfil (@, nome, foto, seguidores e seguindo) é visto por qualquer conta logada e aparece na busca. Treinos, sequência, evolução e histórico só para quem pode ver: você, seguidor aceito ou qualquer conta logada se o perfil estiver **aberto**. | Banco (`get_member_profile`, `can_view_member`) |
| As regras do perfil social fazem parte dos **Termos de Uso 0.2** e da **Política 0.3**, aceitos no cadastro (quem já tem conta aceita no `/aceite`). Nenhum consentimento é pedido no meio do uso. | Core (`legal-content.ts`) + Banco (`legal_documents`) |
| Perfil **privado**: só quem segue vê; seguir vira pedido ("Solicitar para seguir"). Perfil **aberto**: qualquer conta logada vê, inclusive quem não segue; seguir não precisa de aprovação e abrir aceita os pedidos pendentes. **Fechar o perfil não remove seguidores**: só quem chegar depois precisa de aprovação. | Banco (`request_follow`, `update_social_settings`) |
| Seguidor sai só se o titular **remover** (lista de seguidores ou menu do perfil da pessoa) ou **bloquear**. As opções de privacidade ficam só em Configurações › Privacidade. | Banco (`remove_follower`, `block_user`) + Web |
| "Ocultar histórico" esconde só os registros de treino, até de seguidores; evolução, sequência e competição continuam. Medidas, observações e o esforço (RPE) de cada treino nunca aparecem para outra pessoa. | Banco (`list_member_workouts`, GS006) |
| Encontrar pessoas: busca pelo início do @ ou de uma palavra do nome (a partir de 3 caracteres, até 20 resultados) e link do perfil `/pessoa?u=<@>`. Bloquear desfaz os vínculos e esconde dos dois lados; "Pessoa não encontrada" vale para inexistente e bloqueado. Limite de 50 pedidos para seguir por dia. | Banco (`search_social_profiles`, `find_social_profile`, `block_user`) |
| **Competidores** = seguimento mútuo aceito. Períodos: "Este mês" (temporada: semanas cujo sábado cai no mês), 3 meses, 6 meses, 1 ano e personalizado (até 400 dias). Métricas: Pontos, Volume, Treinos e Recordes. | Core (`competitionRange`, `rankCompetitors`) + Banco (`get_competition_*`) |
| **Sessão válida**: treino concluído com ≥ 20 min de tempo efetivo (medido pelo app; acima de 120 min não conta); dia = início do treino no fuso do perfil; no máximo 1 por dia (a de maior carga). Carga = RPE da sessão × minutos considerados; sem RPE, carga 0 (vale para constância). | Banco (`competition_session_scores`) |
| **Pontos da semana**: constância 20 por sessão válida até 60 (3 sessões); esforço = carga da semana / 1800 × 40, até 40; bônus = 5 × semanas cumpridas seguidas (semana com ≥ 3 sessões), até 20, zera na semana não cumprida e continua entre temporadas. Soma arredondada; máximo 120. Pontos do período = soma das semanas que tocam o período. | Banco (`competition_week_scores`) |
| **RPE suspeito** (só com ≥ 4 semanas de histórico; janela de 28 dias antes da sessão): RPE ≥ 9 e mais de 80% das sessões da janela com 9–10 → conta 7; RPE ≥ 3 acima da média da janela → conta a média. O titular vê o motivo de cada ajuste em "Como funciona" e pode pedir revisão (LGPD Art. 20). | Banco (`get_my_competition_sessions`) + Core (`rpeAdjustmentText`) |
| **Ordem do ranking**: valor da métrica; em pontos, desempate por semanas cumpridas, depois sessões válidas, depois carga total. Empate total = mesma posição. "Subiu/Caiu" compara com a posição a 70% do período. | Core (`rankCompetitors`) |
| **Parâmetros** fixos no servidor e públicos (`competition_parameters`); mudança só vale a partir da temporada seguinte e nunca altera parâmetros já publicados. | Banco + Core (`scoringRules`) |
| RPE da sessão (1–10): durante o treino ou até 24 h depois de finalizar (tela ainda não existe). | Banco (`set_session_rpe`) |
| Horários e tempo do treino são gravados só pelo servidor (o app não consegue aumentar a própria pontuação editando o treino). | Banco (`workout_sessions_guard`, `workout_active_periods_guard`) |
| **Avisos de seguidores no celular** (mesma opção "Notificações"): "Novo seguidor" (alguém seguiu seu perfil aberto), "Pedido para seguir" (perfil privado; abre `/solicitacoes`) e "Pedido aceito" (para quem pediu; abre o perfil). Nome e @ de quem agiu; no máximo 1 aviso a cada 24 h por pessoa e tipo (conferido no banco antes de qualquer requisição); nada é enviado se o vínculo já mudou ou há bloqueio. Recusar, remover e bloquear não avisam ninguém. | Banco (`build_follow_alert`, `follow_alerts_sent`, gatilho `on_follow_push_alert`) + Edge Function `push-alerts` |
| **Avisos no celular** (opcional, por aparelho, desligado por padrão): competidor a menos de 20 pontos de passar você na temporada atual ("está chegando"; diferença 0 = "empatou") ou que passou ("te ultrapassou"). Um aviso por mudança de posição e por competidor; quem tem 0 pontos não recebe. Verificado quando um competidor conclui um treino ou informa o esforço. | Banco (`compute_competition_alerts`, `competition_alert_states`) + Edge Function `push-alerts` + Core (`COMPETITION_ALERT_GAP`) |

## 9. Mensagens ao usuário

| Regra | Onde |
|---|---|
| Toda mensagem de erro diz **o que aconteceu e como resolver**, em português. | API (`result.ts`) |
| Erros padronizados: treino já em andamento, treino não encontrado/finalizado, sessão expirada, sem conexão e erro desconhecido. | API (`result.ts`) |

## 9.2 Tour de onboarding

| Regra | Onde |
|---|---|
| Começa sozinho uma vez por sessão, só na Início, sem treino em andamento e se o tour ainda não foi concluído neste aparelho. | `TourProvider` (features/onboarding) |
| 28 passos em 5 capítulos, na ordem de uso: Início (treino de hoje, semana, sequência, calendário, evolução) → Projetos e rotinas → Treino (demonstração da tela: carga, repetições, concluir, tipo, excluir e adicionar série, menu do exercício, adicionar exercício, finalizar) → Competição (período e métrica, pontos, convidar amigos, buscar pessoas) → Perfil. | `TOUR_STEPS` |
| A tela do treino é mostrada com dados de exemplo e os componentes reais, sem iniciar nem gravar treino. | `WorkoutTourStage` |
| O balão fica ao lado do que está destacado (abaixo, senão acima), com seta apontando para ele, sem cobri-lo. | `placeBubble` |
| Pular ou concluir grava "concluído" no aparelho (`guf:tour:main:v2`); um tour novo muda a versão da chave e aparece de novo para todos. | `TourProvider` |
| Durante o tour a tela não recebe toques: avança só por Pular / Voltar / Próximo ("Começar" no último); Esc pula. Alvo que não existe (ex.: atalho de evolução antes do 1º treino) → alternativa do passo ou balão no centro. | `TourOverlay`, `useTargetRect` |
| Rever a qualquer momento: Configurações › Sobre › "Ver tutorial novamente". | `AboutSection` |

## 9.1 Padrões de interface

| Regra | Onde |
|---|---|
| Folhas que sobem de baixo (`BottomSheet`) fecham de três formas: toque fora, tecla Esc ou arrastar para baixo pela alça/título. Ao soltar, fecham se desceram mais de 30% da altura ou se o gesto foi rápido; senão, voltam ao lugar. O conteúdo da folha não arrasta (para não atrapalhar campos e rolagem). | Web (`ds/overlays.tsx` + `shared/hooks/use-sheet-drag.ts`) |
| Carregamento com a animação da logo (`GufLoader`): **08 (Cometa)** nos botões com `loading`; **09 (Sonar)** na abertura do app (verificação da sessão e carregamento da Início depois do login); **07 (Ponto saltitante)** no "Salvando". Botão carregando não aceita toques (evita gravar duas vezes). | Web (`ds/actions.tsx`, `ds/loading.tsx`) |
| Ícones com significado fixo: observação = bloco de notas (`NotepadText`); editar/renomear = lápis (`Pencil`); documento legal = `FileText`. | Web |
| Stories em PNG: textos neutros, legendas e endereço do site em branco; destaques de volume e recordes mantêm volt/dourado. O CTA fica junto das informações, sem espaço automático até o rodapé. Prévia e PNG usam a mesma arte. | Web (`features/share/components/models/` + `StoryArt`) |
| A logo completa do guf aparece em todos os modelos de Stories, com 88 px de altura na arte 1080 × 1920, preservando a proporção também nos modelos estreitos e sem fundo. | Web (`features/share/components/models/` + `ds/brand.tsx`) |
| Na escolha do Story, o tema da imagem (escuro ou claro) é escolhido na folha e vale para a prévia e o PNG; com fundo transparente, os cartões ficam translúcidos (20–100%). | Web (`features/share/components/story-art.tsx`) |
| Imagens de compartilhamento em três formatos: Stories (1080 × 1920), Feed (1080 × 1350) e Stickers (só a forma, fundo transparente). Cada imagem só aparece quando o dado que ela mostra existe (recorde, sequência, meta, exercício com histórico, projeto, descanso médio). | Web (`story-catalog.ts`) + Core (`share.ts`) |
| Descanso médio do treino: média dos intervalos entre séries concluídas seguidas do mesmo exercício (intervalos acima de 10 min não contam). | Core (`storyRestAverage`) |
| Comparação de peso: o volume do treino vira o objeto mais pesado do catálogo que ele alcança (de 20 kg a 200 t); abaixo de 20 kg o modelo não aparece. O valor exibido é o volume na unidade do usuário. | Core (`weight-comparison.ts`) + Web (`WeightComparisonCard`) |
| Na escolha do Story, Compartilhar mostra só o ícone em um botão de 56 px, com rótulo acessível. Baixar imagem ocupa o restante da linha, ou toda a largura sem compartilhamento nativo; os botões ficam bloqueados enquanto a imagem é gerada. | Web (`features/share/components/share-story-sheet.tsx`) |

## 10. Pontos em aberto (decisões de produto)

- Documentos legais: o leitor dentro do app já existe, com texto de rascunho. Falta a redação final do jurídico (dados do controlador e do encarregado, base legal, prazos) e as versões definitivas em `legal_documents` por nova migration.

- Quais medidas corporais entram no módulo de medidas.
- Uso do esforço percebido (RPE): a coluna existe no banco, sem uso no app.
- Exibir também o recorde de 1RM estimado no resumo do treino (o banco já calcula).
