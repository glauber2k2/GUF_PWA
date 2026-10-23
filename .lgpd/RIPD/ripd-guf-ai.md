# RIPD — GUF AI (assistente sobre os próprios treinos) · A021

**Versão**: 0.3 (rascunho técnico, **sem revisão jurídica** ⚖) · **Data**: 2026-10-23 (0.2: 2026-10-22; 0.1: 2026-10-21) · **Branch**: `feat/guf-ai`, `feat/importar-ficha-ia`
**Metodologia**: mesma do `ripd-social.md` (descrição → necessidade → riscos → medidas → decisão).

## 1. O que é
Chat na Início. A pessoa pergunta sobre os próprios treinos ("posso subir a carga?", "alternativa para o 2º exercício de hoje") e o GUF AI responde com base nos dados dela.

**Fluxo**: app → Edge Function `guf-ai` (token do usuário) → ferramentas só de leitura, presas ao usuário (RLS + filtro por `user_id`) → modelo de IA (Google Gemini pela API, via AI SDK da Vercel) → resposta em stream → conversa gravada em `ai_conversations`/`ai_messages`.

## 2. Dados tratados
| Dado | Vai para o provedor de IA? | Observação |
|---|---|---|
| Pergunta (texto livre) | Sim, **anonimizada**: e-mail, CPF/CNPJ, telefone, links e números longos viram "[dado removido]" (`privacy.ts`) | Nomes de pessoas no texto não são detectáveis por regra: a tela pede para não escrever dados pessoais ou de saúde |
| Treinos, séries, cargas, recordes, rotinas, sequência, meta | Sim, só o que a pergunta precisa (ferramentas) | Sem ids do banco: treinos viram "treino-1"; sem nome, e-mail, foto, fuso, @ |
| Catálogo de exercícios | Sim | Não é dado pessoal (exceto nomes de exercícios criados pelo usuário) |
| Nome, e-mail, foto, perfil social, seguidores | **Não** | — |
| Medidas corporais (dado de saúde) | **Nunca** | Nenhuma ferramenta lê `body_measurements` |
| Observações de treino e de exercício | **Nunca** | Texto livre que pode conter saúde (dor, lesão) |
| Dados de outra pessoa | **Nunca** | Ferramentas filtram pelo usuário do token; o modelo não escolhe de quem lê |

**Base legal**: Art. 7º, V — funcionalidade pedida pelo titular dentro do serviço ⚖. Sem perfilamento, publicidade ou decisão automatizada com efeito jurídico (as respostas são sugestões; o app não altera nada sozinho).

## 3. Riscos e medidas
| Risco | Nível | Medidas |
|---|---|---|
| R1 · Provedor usa os dados para treinar modelos (plano **gratuito** da API do Gemini) | **Alto** enquanto no plano gratuito | Só beta (dono + testadores); anonimização e minimização; trocar para plano pago (ou outro provedor) **antes de abrir ao público** — o AI SDK permite trocar só `model.ts` |
| R2 · Transferência internacional (EUA) | Médio | Mesmo tratamento do Supabase/Vercel; registrar em `.lgpd/vendors/google-gemini.md`; cláusulas-padrão ao contratar o plano pago ⚖ |
| R3 · Vazamento de dados de outra pessoa | Baixo | RLS + filtro explícito por `user_id`; ferramentas montadas por requisição com o id do token; RLS das conversas testado (outra conta não lê nem grava) |
| R4 · Injeção de instruções (nome de rotina ou exercício com "ignore as regras…") | Baixo | Instruções dizem que dados das ferramentas são só dados; ferramentas só leem; nada é gravado pelo modelo |
| R5 · Resposta errada sobre carga/saúde | Médio | Aviso fixo "O GUF AI pode errar. Confira as cargas antes de treinar."; instruções: sem diagnóstico, dor/lesão → profissional |
| R6 · Guarda das conversas | Baixo | 180 dias sem mensagem nova → eliminação (job diário, registro `ai_conversations_purged`); entram em "Exportar meus dados" (`guf-export/5`) e saem na exclusão da conta (cascata); conteúdo nunca vai para logs |
| R7 · Custo/abuso | Baixo | 40 perguntas em 24 h por pessoa (servidor) |

## 4. Pendências antes do lançamento público
- [ ] Plano pago do provedor de IA (ou outro provedor) — **obrigatório** (R1)
- [ ] Política de Privacidade: nova seção do GUF AI (finalidade, provedor, país, anonimização, prazo de 180 dias) → nova versão por migration
- [ ] Botão para apagar uma conversa (hoje: só "Nova conversa", exportação e exclusão da conta)
- [ ] Revisão jurídica ⚖

## 5. Decisão
**Prosseguir em beta com modificações** (as medidas acima já implementadas). Não liberar ao público sem os itens da seção 4. Próxima revisão: antes do lançamento público.

## 6. Revisão 0.2 — Importar ficha de treino (2026-10-22)
**O que muda**: além de ler os dados do próprio usuário, o GUF AI converte uma ficha de treino colada pela pessoa (ex.: a que o personal mandou no WhatsApp) num rascunho de projeto e rotinas. Entradas: Projetos › "Importar ficha com o GUF AI" (texto de até 6.000 caracteres) e o chat (ferramenta `converter_ficha_de_treino`, sobre a última mensagem).

**Fluxo**: app → Edge Function `guf-ai` (token do usuário) → texto anonimizado (`redactPersonalData`) + lista numerada do **catálogo do guf** (exercícios do sistema, sem dado pessoal) → modelo → rascunho validado no servidor e no app (schema) → **a pessoa revisa** → RPC `import_training_plan` (SECURITY INVOKER, RLS e limites do plano) cria projeto, exercícios novos e rotinas numa transação. O modelo não grava nada.

| Dado | Vai para o provedor? | Guarda |
|---|---|---|
| Texto da ficha | Sim, **anonimizado** (e-mail, telefone, CPF/CNPJ, links, números longos) | Pela tela de Projetos: **não é guardado** (só o horário em `ai_plan_imports`, 2 dias, para o limite diário). Pelo chat: fica como a mensagem do usuário (180 dias, como as outras) |
| Catálogo do guf | Sim (nome, grupo, equipamento; o modelo escolhe pelo número e nunca vê ids) | — |
| Exercícios criados por outras pessoas | **Nunca**: nem para o modelo nem na gravação (a RPC aceita só o catálogo do guf ou exercícios da própria pessoa, erro GI001) | — |
| Rascunho convertido | Só para o app da pessoa | Em memória até "Criar" ou descartar |

| Risco | Nível | Medidas |
|---|---|---|
| R8 · Ficha com dados de terceiros (nome ou telefone do personal) ou de saúde ("cuidado com o joelho") | Médio | Aviso na tela para apagar nomes, telefones e dados de saúde antes de colar; anonimização do texto e das observações devolvidas; instruções para ignorar nomes e contatos e pôr na observação só método ou técnica; o texto colado em Projetos não é guardado |
| R9 · Injeção de instruções escondida na ficha | Baixo | Instruções tratam a ficha como dado; saída presa a um schema; números e textos ajustados aos limites do app; ids conferidos no servidor (número da lista) e no banco (só catálogo do guf ou da própria pessoa); nada é criado sem a revisão |
| R10 · Uso para fugir do limite diário | Baixo | Cada conversão conta no mesmo limite do plano (`guf_ai_daily_messages`); o registro é gravado antes da chamada ao provedor e o app não pode apagá-lo |

**Base legal**: a mesma (Art. 7º, V ⚖) — funcionalidade pedida pelo titular; dados de terceiros eventualmente colados não são o objetivo do tratamento e são minimizados. **Decisão**: prosseguir em beta; as pendências da seção 4 continuam valendo (a nova seção da Política precisa citar a importação).

## 7. Revisão 0.3 — Extrato de pontos da competição (2026-10-23)
Nova ferramenta `extrato_de_pontos` (`supabase/functions/guf-ai/points-statement.ts`): quando a pessoa pergunta sobre os próprios pontos, o GUF AI lê o extrato dela pela RPC `get_my_points_statement` (a mesma da tela `/competicao/extrato`).

| Dado | Vai para o provedor? | Observação |
|---|---|---|
| Pontos do próprio usuário por semana e origem (constância, sequência, recordes, volume), dias válidos, volume da semana | Sim, só quando a pergunta pede | Derivados dos treinos que o GUF AI já lia; sem ids (treinos viram "treino-1") |
| Pontos, posição ou ranking de outras pessoas | **Nunca** | A RPC lê só `auth.uid()` do token; não recebe id de usuário, então o modelo não tem como pedir de outra pessoa |
| Temporadas fora do plano | Não | O corte (`competition_visible_from`) é feito no banco; a ferramenta só repassa o aviso |

| Risco | Nível | Medidas |
|---|---|---|
| R11 · Exposição de dados da competição de outra pessoa | Baixo | RPC sem parâmetro de pessoa, SECURITY DEFINER filtrando por `auth.uid()`; a resposta não traz nada de competidores |

**Base legal**: a mesma (Art. 7º, V ⚖); finalidade igual (responder sobre os próprios treinos). **Transparência**: Política 1.1 cita o extrato na seção do GUF AI (`requires_reaccept = false`: mesma finalidade, dado derivado do que já era enviado). **Decisão**: prosseguir.
