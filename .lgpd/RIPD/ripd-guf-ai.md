# RIPD — GUF AI (assistente sobre os próprios treinos) · A021

**Versão**: 0.1 (rascunho técnico, **sem revisão jurídica** ⚖) · **Data**: 2026-10-21 · **Branch**: `feat/guf-ai`
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
