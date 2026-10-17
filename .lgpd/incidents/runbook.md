# Runbook de Incidente de Segurança — Guf App

**Versão**: v1 · **Data**: 2026-10-17 · **Modo**: preparatório (nenhum incidente em curso)
**Normas**: LGPD Art. 48 · Resolução CD/ANPD nº 15/2024 (RCIS) · Resolução CD/ANPD nº 2/2022 (ATPP)
**Responsável hoje**: Glauber (desenvolvedor e controlador provisório, pessoa natural — G22). Encarregado ainda não designado (G2): até lá, o controlador assume as funções deste runbook.

> Procedimento técnico preparado com antecedência. **Não é parecer jurídico.** Em incidente real, acione um advogado de proteção de dados já na triagem (T+4h a T+24h).

---

## 0. Cartão de bolso (leia primeiro)

1. **Anote a hora** em que soube que dados pessoais podem ter sido afetados. **Esse é o marco do prazo.**
2. **Contenha** sem apagar nada (seção 4). Exporte os logs do Supabase **na hora** (o plano Free guarda pouco tempo).
3. **Abra o registro** em `log.md` (copie o modelo) — todo incidente é registrado, mesmo os que não são comunicados.
4. **Avalie** com o teste da seção 3: risco relevante **E** uma das 6 categorias → comunicar ANPD e titulares.
5. **Prazo**: **3 dias úteis** a partir do marco. Como ATPP, a Res. 2/2022 permite prazo em dobro, mas **planeje para 3** (a dobra não vale se houver risco à integridade física ou moral dos titulares, e o enquadramento ATPP ainda não foi validado ⚖).
6. Modelos de comunicação: `templates/notification-anpd.md` e `templates/notification-subject.md`. Envio à ANPD pelo portal: https://www.gov.br/anpd

---

## 1. O que é incidente aqui

Qualquer evento, confirmado ou com suspeita fundada, que comprometa **confidencialidade, integridade ou disponibilidade** de dados pessoais tratados pelo guf. Exemplos realistas para esta stack:

| Cenário | Onde | Probabilidade |
|---|---|---|
| Política RLS errada numa migration expõe dados de outros usuários | Supabase (Postgres) | Média |
| Chave `secret`/`service_role` vazada (commit, print, log, `.env.local` compartilhado) | GitHub, máquina do desenvolvedor | Média |
| Conta do desenvolvedor comprometida (Supabase, Vercel, GitHub, Google Cloud) | Painéis | Média (reduz com MFA) |
| Bug no app grava ou mostra dados de uma conta em outra (cache do TanStack, IndexedDB, troca de usuário no mesmo aparelho) | App web | Baixa |
| Exclusão ou corrupção acidental de dados (migration, SQL manual no painel) | Supabase | Média |
| Envio de dados pessoais para logs ou ferramentas externas | Edge Function, console | Baixa |
| Indisponibilidade prolongada com perda de dados (sem backup no Free) | Supabase | Baixa |
| Incidente no próprio operador (Supabase, Vercel) ou no Google | Operador | Baixa |

**Não é incidente do controlador** (mas oriente o titular): aparelho do usuário perdido ou com acesso de terceiros; senha do usuário reutilizada e vazada em outro serviço (avaliar se houve acesso à conta no guf).

## 2. Severidade

| Nível | Critério | Exemplos | Reação |
|---|---|---|---|
| **S1 — Crítico** | Dados sensíveis (medidas) ou de autenticação expostos; acesso indevido em andamento; chave administrativa vazada | `service_role` no GitHub público; RLS aberta em `body_measurements` | Contenção imediata, avaliação de comunicação em até 24h |
| **S2 — Alto** | Dados comuns de vários titulares expostos ou alterados | RLS aberta em `workout_sessions`; e-mails de usuários expostos | Contenção no mesmo dia; avaliação em até 48h |
| **S3 — Médio** | Exposição limitada, sem evidência de acesso indevido, ou perda de dados recuperável | Bug que mostra o treino de outra conta no mesmo aparelho após troca de usuário | Correção em até 3 dias; registrar |
| **S4 — Baixo** | Quase-incidente, sem dado pessoal afetado | Chave pública (`publishable`) exposta — é pública por desenho | Registrar e corrigir |

## 3. Teste de comunicação (Res. 15/2024, Art. 5º — cumulativo)

Comunicar ANPD **e** titulares só se **A e B**:

**A. Risco ou dano relevante** aos interesses e direitos fundamentais dos titulares (justificar por escrito).

**B. Pelo menos uma categoria** — como se aplica ao guf:

| Categoria | No guf |
|---|---|
| I. Dados sensíveis | **Medidas corporais** (`body_measurements`, `measurement_values`) e o fato de ter consentido ao módulo de saúde. Atenção à decisão jurídica N1 (dados de treino podem ser considerados dado de saúde) ⚖ |
| II. Crianças, adolescentes ou idosos | App para 18+ por autodeclaração; adolescentes podem ter mentido (G11). Idosos podem ser usuários: **conferir** se houver data de nascimento (hoje não é coletada) |
| III. Financeiros | Não tratados hoje (sem pagamentos) |
| IV. **Autenticação** | **Sim**: `auth.users` (hash de senha, e-mail), sessões, refresh tokens, chaves de API, client secret do Google OAuth |
| V. Sigilo legal/profissional | Não identificado |
| VI. Larga escala | Não, no beta (poucos testadores). Reavaliar a cada crescimento |

- **A + B** → comunicar ANPD e titulares em 3 dias úteis.
- **Só A, ou só B** → não comunicar; **documentar a decisão e o motivo** no registro.
- **Nenhum** → registrar mesmo assim (Art. 10: registro de todos os incidentes por 5 anos).

## 4. Fluxo por fase

### T+0h — Detecção
- [ ] Registrar **quem/como detectou** (alerta, usuário, pesquisador, você mesmo) e o horário.
- [ ] Registrar o **marco do prazo**: hora em que soube que dados pessoais foram (ou podem ter sido) afetados.
- [ ] Abrir `INC-AAAA-NNN` em `log.md`.
- [ ] Não comentar publicamente (redes, grupos de teste) antes da avaliação.

### T+0h a T+4h — Contenção e preservação (por componente)

**Antes de qualquer correção, preserve evidências:**
- [ ] Exportar logs do Supabase (Auth, API/PostgREST, Postgres, Edge Functions) do período — **a retenção no Free é curta** (confirmar o prazo; pode ser de 1 dia).
- [ ] Salvar prints com data/hora; copiar a migration/commit suspeito; anotar ids de usuário afetados.
- [ ] Se for preciso um dump: `npx supabase db dump --linked` para uma pasta **fora do repositório e do OneDrive**, protegida, e registre onde está. Apagar ao fim da investigação e registrar a eliminação.

**Supabase (projeto `yscoujsisrytytqsxkya`, `sa-east-1`)**
- [ ] RLS: conferir as políticas da tabela afetada (`select * from pg_policies where tablename = '…'`) e corrigir **por nova migration** (regra do projeto). Em emergência, pode aplicar SQL direto e depois registrar a mesma mudança numa migration.
- [ ] Chave `secret`/`service_role` vazada: gerar nova chave e **revogar a antiga** no painel (API Keys); a Edge Function `delete-account` usa a chave injetada pelo Supabase — confirmar que continua funcionando.
- [ ] Sessões suspeitas: encerrar as sessões dos usuários afetados (ou de todos) e, se tokens de acesso puderem ter vazado, **rotacionar a chave de assinatura JWT** (invalida os tokens emitidos). Confirmar no painel o procedimento atual antes de executar.
- [ ] Ataque em andamento ao cadastro/login: desligar novos cadastros temporariamente (Auth › Providers) e/ou ativar CAPTCHA.
- [ ] Último recurso: **pausar o projeto** (o app fica fora do ar).

**Vercel**
- [ ] Deploy com problema: voltar para o deploy anterior (Instant Rollback).
- [ ] Variáveis vazadas: só há a URL e a chave pública do Supabase (públicas por desenho); se outra variável entrar, rotacionar.

**Google Cloud (OAuth)**
- [ ] Client secret vazado: gerar novo no Google Cloud, atualizar no Supabase (Auth › Providers › Google) e excluir o antigo.

**GitHub**
- [ ] Segredo commitado: **rotacionar primeiro** (apagar do histórico não basta); depois limpar o histórico se necessário.

**Contas do desenvolvedor**
- [ ] Trocar senhas e confirmar **MFA** em Supabase, Vercel, GitHub, Google e e-mail; revisar membros e tokens de acesso pessoais de cada painel.

**App (PWA)**
- [ ] Bug que expõe dados entre contas no aparelho: publicar correção; a versão nova aparece como "Nova versão do guf disponível". Avaliar se é preciso orientar os usuários a sair e entrar de novo.

### T+4h a T+24h — Avaliação
- [ ] Dados e tabelas afetados (use `.lgpd/data-map.md` para mapear atividade → tabela).
- [ ] Número de titulares afetados e **total de titulares** da atividade (item 12 da ANPD): `select count(*) from auth.users`.
- [ ] Categorias de titulares (crianças, adolescentes, idosos — destacar).
- [ ] Causa provável e janela de exposição (início e fim).
- [ ] Houve acesso efetivo? (logs de API/Postgres do período).
- [ ] Teste da seção 3, decisão por escrito no registro (controlador + advogado).

### T+24h a T+72h (3 dias úteis) — Comunicação
- [ ] **ANPD**: portal da ANPD, com os 12 itens (`templates/notification-anpd.md`). Guardar o protocolo.
- [ ] **Titulares**: e-mail individual para cada afetado (`templates/notification-subject.md`), em linguagem simples, com os 7 itens. O app ainda não tem envio de e-mail próprio: usar o e-mail do controlador, em cópia oculta ou um a um. Se não houver como contatar individualmente, aviso no app/site por **3 meses**.
- [ ] Operador envolvido (Supabase/Vercel): abrir chamado e guardar o número.

### T+72h em diante — Pós-incidente
- [ ] Complementar a comunicação à ANPD em até **20 dias úteis**, se surgirem informações novas.
- [ ] Análise de causa raiz (5 porquês) e plano de correção com prazos.
- [ ] Atualizar `log.md`, este runbook e, se for o caso, `.lgpd/gaps.md`.

## 5. Contatos

| Quem | Como | Quando |
|---|---|---|
| Controlador / responsável | Glauber — [E-MAIL DE CONTATO DO CONTROLADOR] | Sempre |
| Encarregado | A designar antes do lançamento (G2) | — |
| Advogado de proteção de dados | [A DEFINIR] | Triagem S1/S2 |
| Supabase (suporte) | Painel › Support (plano Free: suporte limitado) | Incidente no operador ou ajuda técnica |
| Vercel (suporte) | Painel › Help | Incidente na hospedagem |
| Google Cloud | Console do projeto OAuth | Client secret |
| ANPD | https://www.gov.br/anpd (Comunicação de Incidente de Segurança) | Decisão de comunicar |

## 6. Medidas de segurança atuais (para o item 3 da ANPD)

- RLS em todas as tabelas, cada usuário só acessa os próprios dados; registro de consentimentos fechado (F3).
- Front usa só a chave pública; chave administrativa só na Edge Function.
- Login com PKCE; senhas com hash pelo Supabase Auth; HTTPS em tudo.
- Banco no Brasil (`sa-east-1`); sem analytics, rastreadores ou envio de dados a terceiros.
- Dados locais limpos ao sair; service worker não guarda dados do usuário.
- **Lacunas conhecidas** (declarar com honestidade): plano Free (logs curtos, backups limitados — G23), sem log de auditoria próprio (G19), MFA dos painéis a confirmar, CORS `*` na Edge Function (G20).

## 7. Exercício simulado (tabletop)

Fazer **1 vez por ano** e antes do lançamento. Cronometrar do marco até a decisão de comunicar; se passar de 3 dias úteis, o processo está quebrado.

| # | Cenário | O que testar |
|---|---|---|
| 1 | Migration nova remove a política de `select` de `workout_sessions` e cria uma permissiva | Detectar, corrigir por migration, medir janela de exposição pelos logs |
| 2 | `.env.local` com chave `secret` enviado num print para um grupo | Rotacionar e revogar chave, conferir Edge Function |
| 3 | Conta GitHub do desenvolvedor sem MFA comprometida | Tokens, chaves, deploys e histórico |
| 4 | Testador relata ver treinos de outra pessoa depois de trocar de conta no mesmo celular | Bug local × incidente; orientar usuários |
| 5 | Supabase comunica incidente na plataforma | Papel do operador; o que pedir; comunicação aos titulares |

- **Primeiro exercício**: [DATA A AGENDAR — sugestão: antes de abrir o beta para pessoas de fora].

## 8. Histórico do runbook
- v1 (2026-10-17): versão inicial (F9 da auditoria).
