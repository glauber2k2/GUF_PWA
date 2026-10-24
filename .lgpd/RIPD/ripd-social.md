# RIPD — Relatório de Impacto à Proteção de Dados

**Atividade**: Seguidores, compartilhamento de treinos, competição e avisos no celular (A017, A018, A019, A020)
**Slug**: ripd-social
**Controlador**: não constituído — desenvolvedor como pessoa natural durante o beta (G22)
**Encarregado**: pendente designação (G2)
**Equipe**: desenvolvedor (Glauber) + assistente técnico
**Versão**: v0.7 (rascunho técnico, **sem revisão jurídica** ⚖) | **Data**: 2026-10-23

> **v0.7**: Editar perfil (`/perfil/editar`, migration `20261024120000_edit_profile`). Dados novos, todos opcionais e escritos pelo próprio titular: **foto enviada** (bucket público `avatars`, pasta `<user_id>/`; recortada em quadrado, reduzida para 512 px e convertida em JPEG no aparelho, o que tira o EXIF, inclusive a localização da câmera; só o dono grava ou apaga; trocar apaga a anterior; excluir a conta apaga a pasta), **bio** (até 150 caracteres, no cartão: qualquer conta logada vê, como nome e foto) e **objetivos de treino** (catálogo fixo: hipertrofia, força, emagrecimento, condicionamento, saúde) e **experiência** (iniciante, intermediário, avançado), visíveis só para quem pode ver os treinos (`unlocked` em `get_member_profile`). Base Art. 7º, V, pela escolha do titular. Nada disso vai para o GUF AI, notificações ou painel (o painel não mostra a bio). Termos 1.1 e Política 1.2 (`requires_reaccept = false`). Riscos R014 e R015.

> **v0.6**: detalhe do treino de outra pessoa (`/pessoa/treino`, função `get_member_workout`, migration `20261021120000_member_workout_detail`). Quem já via o histórico de treinos (você, seguidor aceito ou perfil aberto, e o titular não ocultou) passa a abrir cada treino com data e hora, duração, pausas, volume, exercícios, séries concluídas (tipo, carga e repetições) e recordes. Não amplia quem vê nem cria categoria nova de dado: os Termos 0.3-dev já dizem que essas pessoas veem o "histórico de treinos" e a seção 4 já listava exercícios e séries. Continuam fora: observações, RPE, projeto e rotina (planejamento), medidas. Leitura só pela função `SECURITY DEFINER` que confere `can_view_member_history`; treino inexistente e treino sem permissão dão a mesma resposta (GS009), para não revelar se o id existe. R001 e R007 revistos (mais detalhe por treino, mesmo público); residual sem mudança.

> **v0.5**: o esforço da sessão (RPE) deixou de ser pedido e de entrar na pontuação. Com isso sai a única decisão automatizada do módulo (controle de RPE suspeito, Art. 20) e o dado deixa de ser coletado (a coluna antiga fica sem uso). A pontuação passa a ser constância + sequência + recordes + volume (comparado à média do próprio titular), com regras fixas e públicas. R006 eliminado; R005 revisto. Termos 0.3-dev e Política 0.5-dev sem a menção ao esforço (rascunhos, publicados em 2026-10-20) ⚖.

> **v0.4 (revisão antecipada — gatilho "notificações push")**: avisos no celular (A020) sobre seguidores (novo seguidor, pedido para seguir, pedido aceito: mostram nome e @ de quem agiu, que escolheu seguir/pedir/aceitar; no máximo 1 aviso por dia por pessoa e tipo, registro em `follow_alerts_sent` por 1 dia; nada sobre recusas, remoções ou bloqueios; bloqueio cancela o aviso) e sobre a competição. Opt-in por aparelho (começa desligado; ligar pede a permissão do sistema), só entre competidores (seguimento mútuo aceito, que cada um aprovou e pode desfazer removendo o seguidor ou deixando de seguir). O aviso mostra o nome do competidor e a diferença de pontos, também na tela bloqueada. Dados novos: endereço do aparelho no serviço de push e chaves públicas do navegador (`push_subscriptions`) e a posição relativa por par na temporada (`competition_alert_states`, só para quem ligou os avisos; temporadas antigas apagadas). Conteúdo cifrado de ponta a ponta (RFC 8291): o serviço de push (Google, Apple ou Mozilla) vê só endereço, horário e tamanho. Política 0.4-dev. Riscos R010–R013.

> **v0.3 (decisão do produto)**: nenhum consentimento é pedido no meio do uso. As regras do perfil social estão nos Termos de Uso 0.2 e na Política 0.3, aceitos no cadastro; mostrar treinos é escolha do titular (aprovar seguidor, abrir o perfil), base Art. 7º, V ⚖. Perfil aberto = qualquer conta logada vê; privado = só quem segue. Fechar o perfil não remove seguidores; seguidor sai por remoção ou bloqueio. Risco residual: se treino for dado de saúde (N1), a base precisa ser consentimento específico (Art. 11, I) no cadastro.

> **v0.2**: o modelo mudou depois dos protótipos. Não há mais "ativar o módulo": toda conta tem um perfil social privado com @ aleatório (cartão @/nome/foto encontrável na busca, Art. 7º, V). O consentimento `social_sharing` é pedido ao aceitar o 1º seguidor ou abrir o perfil; perfil aberto é visível a qualquer conta logada; revogar remove os seguidores e fecha o perfil.

---

## 1. Sumário executivo

O guf deixa de ser só pessoal: quem quiser pode ativar um **módulo social** opcional para seguir pessoas, ser seguido, mostrar estatísticas e treinos a seguidores aceitos e **competir** com quem segue de volta (seguimento mútuo), num ranking mensal com pontuação semanal (constância + esforço + bônus de sequência).

Até agora, os dados de treino só eram vistos pelo próprio titular; continua assim até ele autorizar o compartilhamento. A feature os mostra a terceiros, cria contato entre usuários (gatilho registrado em `eca-digital.md`) e introduz uma **decisão automatizada** (o controle de RPE suspeito altera a pontuação). Por isso, este RIPD foi feito antes da implementação, mesmo que o teste da Res. CD/ANPD nº 2/2022 possa não torná-lo obrigatório (seção 2.1).

**Resultado**: prosseguir **com as modificações da seção 12**: perfil privado por padrão, regras nos Termos e na Política aceitos no cadastro, campos mínimos, medidas e observações nunca compartilhadas, leitura de terceiros só por funções que conferem a permissão, e transparência do ajuste de RPE. Lançamento público depende da revisão jurídica já pendente.

## 2. Contexto

- **Produto/feature**: módulo social do guf (PWA de musculação, beta com testadores convidados, 18+ por autodeclaração).
- **Stakeholders**: titulares (usuários e seus seguidores), desenvolvedor/controlador, Supabase (operador).
- **Volume de titulares estimado**: dezenas no beta; muito abaixo de "larga escala".
- **Início previsto**: banco e regras em 2026-10 (branch `feat/seguidores-competicao`); telas após o protótipo de design.

### 2.1 Teste de alto risco (Res. CD/ANPD nº 2/2022, Art. 4º)

| Critério | Situação |
|---|---|
| Geral (a) larga escala | Não |
| Geral (b) afeta significativamente interesses e direitos | **Possível**: exposição do histórico de treino a terceiros e ranking entre conhecidos |
| Específico (c) decisão automatizada | **Sim**: o controle de RPE suspeito troca o valor informado e muda a pontuação |
| Específico (d) dados sensíveis / adolescentes | **Incerto** ⚖: treino pode ser "dado referente à saúde" (N1 do `data-map.md`); acesso provável de adolescentes (`eca-digital.md`) |

Conclusão: há critério específico e o critério geral é discutível. O relatório é mantido como medida de prestação de contas (Art. 6º, X) e pelo compromisso de produto do `CLAUDE.md`.

## 3. Descrição do tratamento

### 3.1 Fluxo de dados

```mermaid
flowchart LR
  T[Titular] -->|aceita Termos e Política no cadastro| C[(consent_records)]
  T -->|@usuário, visibilidade, ocultar histórico| SP[(social_profiles)]
  T -->|pedir / aceitar / remover / bloquear| F[(follows / blocks)]
  T -->|treino + RPE da sessão| W[(workout_sessions)]
  W -->|cálculo no servidor| S[pontuação semanal]
  F -->|seguidor aceito| V[RPCs SECURITY DEFINER]
  S --> V
  W -->|só se o histórico estiver visível| V
  V -->|campos mínimos| O[Seguidor / competidor]
  SP --> A[(audit_log)]
  F --> A
```

1. **Coleta**: @usuário escolhido pelo titular; decisões de seguir/aceitar/bloquear; RPE da sessão (1–10) ao finalizar o treino. Nome e foto já existem no perfil (A004/A005).
2. **Armazenamento**: Supabase (`sa-east-1`), tabelas `social_profiles`, `follows`, `blocks`, coluna `workout_sessions.session_rpe`; parâmetros públicos em `competition_parameters`.
3. **Uso**: mostrar a seguidores aceitos as estatísticas e a pontuação; mostrar os registros de treino se o titular não os ocultou; calcular ranking entre seguidores mútuos.
4. **Compartilhamento**: **só com outros usuários autorizados pelo titular** (seguidor aceito ou conta aberta). Nenhum terceiro externo novo.
5. **Eliminação**: remover seguidor ou bloquear tira o acesso na hora; excluir a conta apaga tudo em cascata (bloqueios e vínculos de outras pessoas com o titular também).

### 3.2 Sistemas envolvidos

- **Frontend**: PWA estático (Next.js export); telas de seguidores e competição (a implementar a partir do protótipo).
- **Backend**: Supabase Postgres, RLS e funções (`supabase/migrations/20261018171956_social_competition.sql`).
- **Cache**: TanStack Query e cópia do último ranking no aparelho (IndexedDB), apagados ao sair da conta.
- **Observabilidade**: nenhuma ferramenta de analytics (compromisso mantido).

### 3.3 Operadores

- Supabase — `.lgpd/vendors/README.md` (mesmo operador).
- Serviço de push do navegador ou do sistema do titular (Google FCM, Apple APNs, Mozilla autopush) — A020; escolhido pelo titular ao usar o navegador, recebe só a mensagem cifrada e metadados (`.lgpd/vendors/push-services.md`) ⚖.

## 4. Necessidade e proporcionalidade

- **Menos dados?** Sim, e foi aplicado:
  - Terceiros recebem só @usuário, nome, foto, contagens, pontos e (se visível) data, nome, duração, exercícios e séries dos treinos.
  - **Nunca** recebem medidas corporais (A010), observações em texto livre, RPE individual, e-mail ou fuso.
  - Busca só por prefixo do @ (mínimo 3 caracteres, até 20 resultados), sem listagem geral de usuários.
- **Alternativas avaliadas**:
  - Perfil público para qualquer pessoa: rejeitado. Aumenta exposição e contato com estranhos.
  - Abrir as tabelas de treino a seguidores por RLS: rejeitado. Um erro numa política vazaria tudo; foram adotadas funções que conferem a permissão.
  - Duração informada pelo usuário: rejeitada. O tempo medido pelo app é mais fiel e não exige um passo a mais.
  - Pontuação pela carga levantada: rejeitada pelo produto. A constância e o esforço percebido são mais justos entre níveis diferentes.
- **Razão da escolha**: o módulo é opcional e desligado; quem não ativa não muda nada no tratamento atual.

## 5. Princípios LGPD (Art. 6)

| Princípio | Como é atendido |
|---|---|
| I — Finalidade | Mostrar progresso a pessoas escolhidas e competir com quem segue de volta; descrito no termo do módulo |
| II — Adequação | O titular escolhe cada seguidor (conta privada) ou abre a conta com aceite explícito |
| III — Necessidade | Campos mínimos (seção 4); medidas e observações fora |
| IV — Livre acesso | Listas de seguidores, seguindo, pedidos e bloqueios no app; exportação `guf-export/3` |
| V — Qualidade | O titular edita @usuário e configurações; pontuação recalculada a cada consulta (sem cópia desatualizada) |
| VI — Transparência | Regras e parâmetros da pontuação legíveis por todos; ajuste de RPE mostrado ao titular com o motivo |
| VII — Segurança | RLS só de leitura do que é seu; gravações por funções com auditoria; horários do treino gravados só pelo servidor |
| VIII — Prevenção | Bloqueio, remoção de seguidor, limite de 50 pedidos/dia, resposta igual para "não existe" e "bloqueado" |
| IX — Não discriminação | Mesma regra para todos; parâmetros fixos e públicos; sem perfilamento para publicidade |
| X — Responsabilização | `audit_log`: mudança de visibilidade, aceite e fim de vínculo, bloqueio; aceite dos Termos e da Política no `consent_records` |

## 6. Base legal

- **Art. 7º, V** para o cartão do perfil e os vínculos (A017) e para mostrar treinos e competir (A018–A019), por escolha do titular no app (aprovar seguidor, abrir o perfil), com as regras nos Termos 0.2 e na Política 0.3 aceitos no cadastro (versão e hash registrados) ⚖. Se o jurídico entender que dados de treino são dado de saúde (N1), será preciso consentimento específico e destacado (**Art. 11, I**), pedido no cadastro em caixa própria e desmarcada.
- **Aceite de cada seguidor** (conta privada) e **aceite ao abrir a conta**: escolhas do titular, registradas no `audit_log`.
- O RPE da sessão também serve ao próprio titular (A007, Art. 7º, V); seu uso na pontuação está descrito nos Termos 0.2.

## 7. Direitos do titular

| Direito (Art. 18) | Como é exercido |
|---|---|
| I — Confirmação | Configurações › Privacidade mostra se o perfil está aberto ou privado e se o histórico está oculto |
| II — Acesso | Listas no app + `export_my_data` (`guf-export/3`: perfil social, vínculos, bloqueios) |
| III — Correção | Editar @usuário e configurações |
| IV — Bloqueio/eliminação | Remover seguidor, deixar de seguir, bloquear, fechar o perfil, ocultar o histórico |
| V — Portabilidade | Exportação em JSON |
| VI — Eliminação | Remover seguidor tira o acesso na hora; excluir a conta apaga o perfil social |
| VII — Compartilhamento | Lista de quem segue o titular = lista exata de quem vê seus dados |
| VIII — Não consentir | O perfil começa privado: sem aprovar ninguém nem abrir o perfil, ninguém vê seus treinos |
| IX — Revogação | Fechar o perfil, ocultar o histórico, remover seguidores ou bloquear, a qualquer momento |
| **Art. 20 — Revisão de decisão automatizada** | `get_my_competition_sessions` mostra RPE informado, RPE usado e o motivo do ajuste; pedido de revisão pelo canal do titular (`PRIVACY_CONTACT_EMAIL`, 15 dias) |

## 8. Identificação e tratamento de riscos

### 8.1 Matriz de riscos

| ID | Risco | P | I | Nível | Mitigação | Status | Residual |
|---|---|---|---|---|---|---|---|
| R001 | Seguidor vê mais do que o titular quis | 2 | 4 | 8 | Privado por padrão; histórico ocultável (esconde a lista e o detalhe de cada treino); campos mínimos (sem observações, RPE, projeto ou rotina); leitura só por funções que conferem `can_view_member`/`can_view_member_history` | mitigado | 3 |
| R002 | Erro de política expõe treinos a qualquer usuário | 2 | 5 | 10 | Nenhuma política nova em tabelas de treino; funções `SECURITY DEFINER` com conferência explícita; testes de permissão antes do lançamento | mitigado (testes pendentes) | 4 |
| R003 | Contato indesejado / assédio | 3 | 3 | 9 | Sem chat; bloqueio e remoção; busca restrita; limite de pedidos | mitigado | 4 |
| R004 | Adolescente usando o módulo (acesso provável) | 2 | 4 | 8 | 18+ por autodeclaração; procedimento de conta de menor (`eca-digital.md`) | parcial ⚖ | 6 |
| R005 | Fraude na pontuação (editar horários, registrar cargas falsas) | 4 | 2 | 8 | Horários gravados só pelo servidor; períodos sem sobreposição; 1 sessão por dia; teto por parte (recordes até 25, volume até 15 e relativo à própria média) | mitigado | 4 |
| R006 | Ajuste automático de RPE injusto | — | — | — | Eliminado em 2026-10-20: o esforço saiu da pontuação | eliminado | 0 |
| R007 | Inferência sobre saúde pelo histórico compartilhado (inclusive cargas e séries no detalhe do treino) | 2 | 3 | 6 | Medidas nunca compartilhadas; histórico ocultável; perfil privado por padrão; se N1, consentimento no cadastro | parcial ⚖ | 4 |
| R008 | Nome e foto aparecem na busca para qualquer conta | 3 | 2 | 6 | @ aleatório no cadastro; busca só por prefixo (≥ 3 caracteres, até 20 resultados); bloqueados não aparecem; nada de treino sem consentimento. Pendente: opção de não aparecer na busca ⚖ | parcial | 4 |
| R009 | Pressão por comparação (bem-estar) | 2 | 2 | 4 | Pontos premiam constância e não carga; limite de pontos por semana; ranking só entre seguidores mútuos | aceito | 4 |
| R010 | Aviso na tela bloqueada revela nome do competidor e pontos a quem pega o celular | 3 | 2 | 6 | Opt-in por aparelho; texto mínimo (nome e diferença, sem treinos); o sistema permite esconder o conteúdo na tela bloqueada | mitigado | 3 |
| R011 | Avisos de uma conta chegam a outra pessoa no mesmo aparelho (troca de conta) | 2 | 3 | 6 | Sair da conta apaga a inscrição no servidor e cancela no navegador; o mesmo aparelho inscrito por outra conta passa para ela (`save_push_subscription`); excluir a conta apaga em cascata | mitigado | 2 |
| R012 | Excesso de avisos / pressão (bem-estar) | 3 | 2 | 6 | Competição: só na mudança de posição (um aviso por transição e por competidor), só competidores mútuos, só a temporada atual. Seguidores: no máximo 1 aviso por dia por pessoa e tipo; limite existente de 50 pedidos por dia. Desligar a qualquer momento | mitigado | 3 |
| R013 | Assédio por avisos (seguir e deixar de seguir repetidamente para aparecer no celular de alguém) | 2 | 3 | 6 | 1 aviso a cada 24 h por pessoa e tipo, conferido no gatilho (nem a requisição sai); bloquear interrompe; o aviso só é enviado se o vínculo ainda existe | mitigado | 3 |
| R014 | Bio com dado sensível ou de terceiros (saúde, contato, nome de outra pessoa) exposta a qualquer conta logada | 2 | 3 | 6 | Campo opcional e curto (150); aviso nos Termos para não escrever dados de saúde nem de terceiros; o titular apaga quando quiser; contas que assediam podem ser encerradas (Termos) | mitigado | 4 |
| R015 | Objetivo "Emagrecimento" ou "Saúde" lido como dado de saúde (Art. 11) | 2 | 2 | 4 | É meta de treino escolhida num catálogo fixo, não condição clínica; opcional; só aparece para quem já vê os treinos; nunca vai para o GUF AI. Revisar se o catálogo ganhar itens ligados a condição de saúde ⚖ | mitigado | 3 |

### 8.2 Riscos não mitigáveis

- **R004**: a autodeclaração de idade continua sendo a única barreira até a decisão jurídica sobre verificação de idade (`eca-digital.md`, seção 4).

## 9. Salvaguardas técnicas

- [x] TLS em trânsito (Supabase/hospedagem)
- [x] Criptografia em repouso (Supabase)
- [x] Ids internos (uuid) no `audit_log`, sem nome nem e-mail
- [x] Menor privilégio: sem escrita direta nas tabelas sociais; leitura de terceiros só por funções
- [x] Audit log imutável e encadeado (`audit_log`)
- [x] Horários do treino protegidos por gatilho (integridade da pontuação)
- [x] Testes SQL de permissão (32 casos, transação desfeita; 2026-10-18)
- [x] Detalhe do treino de terceiros só por `get_member_workout` (confere `can_view_member_history`; resposta igual para inexistente e sem permissão)
- [ ] MFA no painel do Supabase (`security-checklist.md`)
- [x] Avisos: mensagem cifrada para o aparelho (RFC 8291) e assinada (VAPID); chave privada só nos secrets da Edge Function; função chamada só pelo banco com segredo do Vault; inscrições e estados sem leitura por terceiros (RLS)

## 10. Salvaguardas administrativas

- [x] Plano de resposta a incidente (`incidents/runbook.md`)
- [x] Canal do titular e prazo de 15 dias (`dsar/workflow.md`)
- [x] Regras nos Termos 0.2-dev e na Política 0.3-dev (rascunhos; publicados no banco em 2026-10-18) ⚖
- [x] Avisos no celular na Política 0.4-dev (rascunho; publicada no banco em 2026-10-19, migration `20261019230418_legal_privacy_push_alerts`) ⚖
- [ ] DPA com o Supabase (G7)

## 11. Consulta a partes interessadas

- Titulares: não realizada (beta pequeno; colher opinião dos testadores na primeira versão).
- Encarregado: pendente designação.
- Jurídico: pendente (sem orçamento no beta) ⚖.
- Segurança: revisão técnica deste relatório (2026-10-18).

## 12. Decisão

- [ ] Prosseguir como planejado
- [x] Prosseguir com modificações
- [ ] Não prosseguir
- [ ] Consultar ANPD

**Modificações exigidas**:
1. Perfil privado por padrão; treinos só para seguidores aprovados ou com o perfil aberto (escolha do titular).
2. Regras nos Termos e na Política aceitos no cadastro (versão e hash); controles de privacidade em Configurações › Privacidade.
3. Campos mínimos; medidas, observações e RPE individual nunca vão para terceiros.
4. Transparência e revisão do ajuste de RPE (Art. 20).
5. Testes de permissão no banco antes de liberar para testadores (feito em 2026-10-18).
6. Lançamento público só após revisão jurídica (termo do módulo, política, N1 e ECA Digital).
7. Avisos no celular (A020): desligados por padrão, por aparelho; competição só entre competidores mútuos e só na mudança de posição; seguidores no máximo 1 por dia por pessoa e tipo; inscrição apagada ao desligar, sair da conta ou excluir a conta.

**Aprovado por**:
- Encarregado: pendente
- Patrocinador do produto: Glauber — pendente de confirmação

## 13. Plano de revisão

- Próxima revisão obrigatória: antes do lançamento público ou 2027-04-18, o que vier primeiro.
- Revisões feitas: v0.4 em 2026-10-19 (notificações push da competição e de seguidores); v0.5 em 2026-10-20 (pontuação sem RPE); v0.6 em 2026-10-21 (detalhe do treino de outra pessoa); v0.7 em 2026-10-23 (editar perfil: foto enviada, bio, objetivos e experiência).
- Gatilhos para revisão antecipada: perfil visível fora dos seguidores, chat ou mensagens, outros tipos de notificação push (além dos avisos da competição e de seguidores), prêmios, mudança nos parâmetros da pontuação, novo operador, incidente, base > 50% maior.
