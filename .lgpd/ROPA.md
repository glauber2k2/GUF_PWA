# Registro das Operações de Tratamento (ROPA) — Guf App

**Versão**: 0.1 (rascunho) · **Data**: 2026-10-17 · **Base**: LGPD Art. 37 · modelo simplificado da ANPD para agentes de tratamento de pequeno porte (Res. CD/ANPD nº 2/2022)
**Fontes**: `data-map.md` (A001–A023), `legal-basis.md`, `vendors/`, `retention.md`, `audit-log.md`, `consent-ledger.md`
**Situação**: ⏸ rascunho técnico, **sem revisão jurídica** (adiada por falta de orçamento — decisão de 2026-10-17). Não é parecer.

**Histórico**
- 0.1 (2026-10-17): primeira versão, a partir do mapa de dados v1 e das etapas F3–F8.
- 0.2 (2026-10-21): A015 atualizada (planos Free/Pro implementados; pagamento ainda futuro).

---

## 1. Informações de contato

| Papel | Quem | Contato |
|---|---|---|
| **Controlador** | [NOME COMPLETO DO DESENVOLVEDOR], pessoa natural, responsável pelo beta do guf (sem empresa constituída — G22) | devglaubermonteiro@gmail.com |
| **Encarregado** | Não designado — dispensa de agente de pequeno porte (Res. 2/2022, Art. 11) a confirmar ⚖; designação prevista para antes do lançamento | Canal de comunicação com o titular: devglaubermonteiro@gmail.com |
| **Operador** | Supabase, Inc. — banco de dados, autenticação, e-mails de autenticação, funções e jobs | Projeto `yscoujsisrytytqsxkya`, região São Paulo (`sa-east-1`) |
| **Operador** | Vercel Inc. — hospedagem do site estático (testes) | EUA / rede global |
| **Terceiro (controlador independente)** | Google LLC — login com Google, por escolha do titular | EUA |

**O guf atua apenas como controlador**; não trata dados em nome de terceiros (nenhuma atividade como operador).

## 2. Visão geral das operações

| ID | Operação | Finalidade | Hipótese legal | Titulares | Dados | Sensível? | Compartilhamento | Retenção |
|---|---|---|---|---|---|---|---|---|
| A001 | Cadastro e autenticação por e-mail | Criar a conta e dar acesso | Art. 7º, V | Usuários | E-mail, senha (hash), nome opcional, plataforma, declaração de idade | Não | Supabase | Enquanto a conta existir |
| A002 | Login com Google | Entrar com a conta Google | Art. 7º, V | Usuários | Nome, e-mail, foto (URL), id Google | Não | Google (origem), Supabase | Enquanto a conta existir |
| A003 | Aceites e consentimentos | Comprovar aceites e o consentimento de saúde | Art. 7º, II; após a exclusão, Art. 7º, VI ⚖ | Usuários e ex-usuários | Documento/versão/hash, ação, origem, plataforma, data; após a exclusão, e-mail em SHA-256 | Não* | Supabase | Conta + 5 anos da prova após a exclusão ⚖ |
| A004 | Perfil e preferências | Personalizar o app | Art. 7º, V | Usuários | Nome, unidade, meta, fuso, finalização automática | Não | Supabase | Enquanto a conta existir |
| A005 | Foto do perfil | Exibir a foto | Art. 7º, V | Usuários | URL do Google; arquivo enviado (futuro) | Não | Google, Supabase Storage (futuro) | Enquanto a conta existir; arquivo apagado na exclusão |
| A006 | Planejamento de treinos | Projetos, rotinas e exercícios | Art. 7º, V | Usuários | Nomes, observações, dias, séries/reps/descanso | Não | Supabase | Enquanto a conta existir ou até apagar |
| A007 | Registro de treinos | Registrar treinos feitos | Art. 7º, V ⚖ (N1) | Usuários | Datas, horários, pausas, cargas, reps, RPE, observações | Não ⚖ | Supabase | Enquanto a conta existir ou até apagar |
| A008 | Finalização automática | Encerrar treino esquecido (opcional) | Art. 7º, V | Usuários que ligaram a opção | Horários das séries, status | Não | Supabase (pg_cron) | Igual a A007 |
| A009 | Histórico e evolução | Calendário, sequência, volume, 1RM, recordes | Art. 7º, V | Usuários | Derivados de A007 | Não ⚖ | Supabase | Calculado sob demanda |
| **A010** | **Medidas corporais** | Acompanhar medidas (opcional) | **Art. 11, I — consentimento específico** | Usuários que consentiram | Data e circunferências (cm); só o titular vê | **Sim (saúde)** | Supabase | Até revogar (apaga na hora) ou excluir a conta |
| A011 | Dados no aparelho | Treinar sem internet | Art. 7º, V | Usuários | Sessão, treino em andamento, fila, cópias, preferências | Não | Nenhum (aparelho) | Até sair da conta |
| **A012** | **Registros de acesso e segurança** | Segurança e prevenção a fraude; guarda legal se aplicável | **Art. 7º, IX — legítimo interesse** (LIA) + Art. 7º, II ⚖ | Usuários e visitantes | IP, data/hora, user-agent, eventos de login | Não | Supabase, Vercel | Retenção do plano dos operadores (G9) |
| A013 | Exportação de dados | Atender acesso e portabilidade | Art. 7º, II (Art. 18, II e V) | Usuários | Todo o conteúdo da conta (`guf-export/3`, com perfil social, vínculos e bloqueios) | Sim, se houver medidas | Nenhum (arquivo no aparelho) | Não guardado no servidor |
| A014 | Exclusão de conta | Atender eliminação | Art. 7º, II (Art. 18, VI) | Usuários | Id da conta | Sim, se houver medidas | Supabase | Eliminação imediata; exceções A003 e A016 |
| A015 | Planos e direitos de acesso | Liberar o que o plano inclui; gerir a assinatura do Pro (futuro) | Art. 7º, V; fiscal Art. 7º, II ⚖ | Todos os usuários; assinantes (futuro) | Plano, origem e validade do direito; situação da assinatura e código no prestador (futuro); aceite dos Termos da Assinatura | Não | Supabase; prestador de pagamento (futuro) | Enquanto a conta existir; fiscal com o prestador pelo prazo legal ⚖ |
| A016 | Registro de auditoria | Prestação de contas e apuração de incidentes | Art. 7º, II; após a exclusão, Art. 7º, VI ⚖ | Usuários e ex-usuários | Id interno, evento, data, contagens | Não | Supabase | 5 anos, eliminação mensal ⚖ |
| A017 | Perfil social e seguidores | Perfil encontrável e escolher quem acompanha o progresso | Art. 7º, V ⚖ | Todos os usuários | @usuário, nome, foto, visibilidade, vínculos, bloqueios | Não | Supabase | Enquanto a conta existir |
| A018 | Compartilhamento de treinos | Mostrar estatísticas e treinos a seguidores aceitos ou, com o perfil aberto, a qualquer conta | Art. 7º, V (Art. 11, I se N1) ⚖ | Usuários com seguidores ou perfil aberto | Nome, foto, pontos, treinos (sem medidas, observações nem RPE) | Não ⚖ | Supabase | Sob demanda |
| A019 | Competição e pontuação | Ranking por período entre seguidores mútuos | Art. 7º, V ⚖ | Seguidores mútuos | RPE da sessão, tempo efetivo, pontos | Não ⚖ | Supabase | RPE igual a A007; pontos não guardados |
| A020 | Avisos no celular (competição e seguidores) | Avisar sobre novo seguidor, pedido para seguir, pedido aceito e competidor que chega a menos de 20 pontos ou ultrapassa | Art. 7º, V (opt-in no aparelho) ⚖ | Quem ligou as notificações, quem seguiu/pediu/aceitou e competidores | Endereço do aparelho no serviço de push, chaves públicas, posição relativa por temporada, último aviso de seguidor (1 dia) | Não | Supabase; serviço de push do navegador (EUA, conteúdo cifrado) ⚖ | Até desligar, sair ou excluir; estados da temporada atual e da anterior |
| A022 | Administração e suporte da conta | Suporte, correção de @ e nome, plano manual e desvincular login social a pedido | Art. 7º, V; Art. 18, III | Usuários; colaboradores | Resumo da conta (e-mail mascarado; sem medidas, observações, conversas ou cargas), status do consentimento de saúde (sim/não), motivo das alterações | Status do consentimento | Supabase | Auditoria 5 anos; papéis até desligar |
| A023 | Comunicados no app | Avisos de serviço, legais e (após a LIA) de produto ao abrir o app | Art. 7º, V; II; IX + Art. 10 (produto, LIA) ⚖ | Usuários no público | Regra do público, lista de ids, visto/fechado/clique | Não | Supabase | Ids até o fim; recibos 12 meses após o fim |
| A021 | GUF AI | Responder perguntas do titular sobre os próprios treinos e sugerir ajustes (texto) | Art. 7º, V ⚖ | Quem usa o GUF AI | Perguntas (anonimizadas antes do provedor), treinos, séries, cargas, recordes, rotinas, avaliação das respostas | Não | Supabase; Google (API do Gemini, EUA) ⚖ | Conversas: 180 dias sem mensagem nova (job diário) ou até excluir a conta |

\* O registro do consentimento de saúde indica que o titular usa o módulo de medidas, sem conter a medida.

**Legítimo interesse (Art. 37, destaque)**: só a A012 (segurança), com teste de proporcionalidade em `lia/a012-seguranca.md` (rascunho).

## 3. Categorias de titulares

- **Usuários** do app, declarados maiores de 18 anos (autodeclaração; adolescentes podem acessar — análise ECA Digital pendente, F13).
- **Ex-usuários** (só A003-prova e A016, pseudonimizados).
- **Visitantes** do site sem conta (só registros de acesso da hospedagem, A012).

## 4. Compartilhamento e transferência internacional

| Destinatário | Papel | Atividades | País | Contrato (DPA) | Base do Art. 33 |
|---|---|---|---|---|---|
| Supabase, Inc. | Operador | A001–A016 | Dados no Brasil (`sa-east-1`); empresa e sub-operadores nos EUA | Não arquivado (G7) | A definir (G8) ⚖ |
| Vercel Inc. | Operador | A012 (logs de acesso) | EUA / global | Não arquivado (G7) | A definir (G8) ⚖ |
| Google LLC | Controlador independente | A002, A005 | EUA | Não se aplica ⚖ | Dados enviados pelo titular por escolha dele |
| Autoridades | Por obrigação legal/ordem judicial | Qualquer | Brasil | — | — |

**Não há venda de dados, publicidade, analytics ou rastreadores.**

## 5. Medidas de segurança (resumo — detalhes em `security-checklist.md`)

- RLS em todas as tabelas (cada conta só acessa os próprios dados); front só com a chave pública.
- Login com PKCE; senhas com hash; HTTPS; cabeçalhos de segurança na hospedagem.
- Registro de consentimentos fechado (só funções do banco); prova pós-exclusão com e-mail em hash.
- Registro de auditoria só inclusão, encadeado por hash (`audit_log`, `verify_audit_log()`).
- Medidas: consentimento obrigatório para gravar, revogação que apaga na hora, nunca em logs.
- Dados locais apagados ao sair; service worker não guarda dados do usuário.
- Runbook de incidente e registro de 5 anos (`incidents/`).
- **Lacunas declaradas**: planos gratuitos (logs curtos, backups a conferir — G23, G15), MFA dos painéis a confirmar, sem DPAs arquivados.

## 6. Períodos de armazenamento

Ver `retention.md` (tabela completa). Resumo: tudo enquanto a conta existir, eliminado em cascata na exclusão; exceções mínimas por 5 anos: prova dos aceites (`consent_proofs`) e registro de auditoria (`audit_log`) ⚖.

## 7. Decisões automatizadas

- **A008 — finalização automática do treino**: regra fixa (todas as séries concluídas e última há ≥ 30 min), só para quem ligou a opção; pode desligar e pedir revisão (Art. 20). Explicada na política (rascunho v1, seção 5).
- Nenhuma outra decisão automatizada ou perfilamento.- **A019 — controle de RPE suspeito na pontuação** (REMOVIDO em 2026-10-20: o esforço não é mais pedido nem usado): regra fixa e pública (RPE ≥ 3 acima da média pessoal das últimas 4 semanas → usa a média; RPE 9–10 em mais de 80% das sessões → limita a 7). Só entre seguidores mútuos; o titular vê o motivo de cada ajuste e pode pedir revisão (Art. 20). Avaliado em `RIPD/ripd-social.md`.
- Nenhuma outra decisão automatizada ou perfilamento.

## 8. Observações

- **Avaliação de risco**: A010 (dados de saúde) — RIPD `RIPD/ripd-medidas-corporais.md` v0.1 (2026-10-22), decisão: prosseguir em beta.
- **Pendências jurídicas** ⚖ (futuro, sem orçamento agora): N1 (dados de treino como dado de saúde?), prazos de 5 anos, enquadramento como agente de pequeno porte, Marco Civil art. 15, ECA Digital.
- **Revisão deste ROPA**: a cada nova atividade, operador ou mudança de finalidade, e no mínimo **a cada 6 meses** — próxima: **2027-04-17**.
