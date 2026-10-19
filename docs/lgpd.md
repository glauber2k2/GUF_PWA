# LGPD no Guf App — o que já está feito e o que falta

# 0. Informações

Este documento tem como finalidade resumir para o time o que a LGPD exige do guf, o que já está implementado e o que falta.

| Feito por | Glauber |
| --- | --- |
| Data de Criação | 17/10/2026 |

**Atualizado em**: 2026-10-17 · **Fase**: beta gratuito, só com testadores convidados · **Controlador**: o desenvolvedor, como pessoa natural (sem empresa aberta)

Este é o resumo para quem trabalha no projeto. Os detalhes de cada tema, as evidências e os testes ficam em [`.lgpd/`](../.lgpd/STATUS.md) (auditoria completa) e as regras de implementação no [`CLAUDE.md`](../CLAUDE.md).

> Documento técnico, **não é parecer jurídico**. Itens marcados com ⚖ precisam de advogado de proteção de dados antes do lançamento público.

---

## 1. O que já está implementado

### 1.1 Coleta mínima e transparência
| O quê | Como | Onde |
|---|---|---|
| Só dados necessários | Sem localização, contatos, telefone, dados de pagamento ou de outros apps | Banco (`supabase/migrations/`) |
| Sem rastreamento | Nenhum analytics, pixel, anúncio, cookie de terceiros ou fonte/CDN externa | App inteiro; compromisso registrado no `CLAUDE.md` |
| Documentos legais no app | Termos, Política de Privacidade e Termo de Saúde lidos dentro do app, inclusive sem internet, com "Em resumo" e marcação de rascunho | `packages/core/src/legal-content.ts`, `features/legal/` |
| Política de Privacidade 0.2-dev | Já informa banco no Brasil, prestadores (Supabase, Vercel, Google), contato do beta, eliminação na hora e prova dos aceites por 5 anos | `legal-content.ts` + migration `privacy_policy_0_2_dev` |

### 1.2 Consentimento e aceites
| O quê | Como | Onde |
|---|---|---|
| Cadastro com confirmações explícitas | "Tenho 18 anos ou mais" e "Li e aceito os Termos e a Política", ambas desmarcadas; botão bloqueado até marcar | `features/auth/ui/signup-form.tsx` |
| Portão de aceite | Documento novo ou versão nova → `/aceite` antes de usar o app, com "O que mudou" | `/aceite`, `pending_documents()` |
| Consentimento de saúde em camadas | Resumo sempre visível, termo completo, caixa desmarcada, botões de mesmo peso; só para o módulo de medidas | Banco (`grant_health_consent`) + componentes prontos |
| **Registro de consentimentos fechado** | O app só lê; gravação só por funções do banco que validam origem e plataforma; nada é editado ou apagado (revogar = novo registro) | Migration `consent_ledger_hardening` |
| **Prova do texto aceito** | Cada versão guarda o hash SHA-256 do texto exibido; em desenvolvimento, `/documentos` avisa se não conferir | `packages/core/src/legal-hash.ts`, `pnpm --filter @guf/core legal:hashes` |
| **Prova após excluir a conta** | Cópia mínima dos aceites (documento, versão, data, e-mail em hash) por 5 anos ⚖, apagada por job diário | Tabela `consent_proofs` |

### 1.3 Direitos do titular (art. 18)
| Direito | Como | Onde |
|---|---|---|
| Acesso e portabilidade | "Exportar meus dados": JSON completo (`guf-export/2`) gerado no aparelho | Perfil › Privacidade; `export_my_data()` |
| Correção | Perfil e telas de treino/rotina editáveis | Perfil |
| Revogação do consentimento | "Revogar consentimento" apaga todas as medidas na mesma operação | Perfil › Privacidade; `revoke_health_consent()` |
| Eliminação | "Excluir minha conta": apaga tudo em cascata e a foto do Storage | Edge Function `delete-account` |
| Demais pedidos | "Outros pedidos sobre seus dados" abre o e-mail do canal (devglaubermonteiro@gmail.com) com o assunto pronto; resposta em até 15 dias | Perfil › Privacidade; fluxo em `.lgpd/dsar/workflow.md` |
| Revisão de decisão automatizada | Finalização automática do treino: desligada por padrão, regra explicada, revisão por e-mail | Perfil; política |

### 1.4 Segurança
| O quê | Como |
|---|---|
| Isolamento dos dados | RLS em todas as tabelas: cada conta só lê e grava os próprios dados |
| Chaves | Front usa só a chave pública; chave administrativa só na Edge Function |
| Login | PKCE, senhas com hash, mínimo de 8 caracteres no app |
| Hospedagem | HTTPS; cabeçalhos de segurança (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) em `vercel.json` |
| Exclusão de conta | CORS por lista de sites (`ALLOWED_ORIGINS`) e token validado no servidor |
| Aparelho | Dados locais apagados ao sair; o service worker não guarda dados do usuário |
| Dados no Brasil | Banco no Supabase em São Paulo (`sa-east-1`) desde 2026-10-16 |

### 1.5 Prestação de contas
| O quê | Como | Onde |
|---|---|---|
| **Registro de auditoria** | Aceites, revogações, exportações, medidas apagadas e exclusões de conta gravados pelo banco; só inclusão, encadeado por hash; 5 anos ⚖ | `audit_log`, `select * from verify_audit_log();` |
| Mapa de dados e bases legais | 16 atividades com finalidade, base legal, retenção e operadores | `.lgpd/data-map.md`, `.lgpd/legal-basis.md` |
| ROPA | Registro das operações (rascunho 0.1) | `.lgpd/ROPA.md` |
| Prazos de guarda | Tabela completa e passo a passo da exclusão | `.lgpd/retention.md` |
| Incidentes | Runbook (prazo de 3 dias úteis), modelos de comunicação à ANPD e ao titular, registro de 5 anos | `.lgpd/incidents/` |
| Menores | Avaliação do ECA Digital (rascunho), público 18+ e procedimento para conta de menor | `.lgpd/eca-digital.md` |
| Fornecedores | Fichas de Supabase, Vercel e Google | `.lgpd/vendors/` |

---

## 2. O que falta e por quê

### 2.1 Depende de você (gratuito)
| Falta | Por que ainda falta |
|---|---|
| Ligar MFA no Supabase, Vercel, GitHub e Google | Só o dono das contas pode ligar; é a proteção mais importante hoje |
| Definir `ALLOWED_ORIGINS` (`npx supabase secrets set …`) | Precisa do endereço exato do app na Vercel; até lá a função aceita qualquer origem (o token continua obrigatório) |
| Supabase › Auth: senha mínima 8 e confirmação de e-mail | Configuração do painel, sem acesso pelo código |
| Conferir backups do plano Free | Informação só visível no painel; preenche o prazo de backups da política |
| Apagar o `vercel.json` que não for usado | Depende de qual é o Root Directory do projeto na Vercel |
| Testar "Excluir minha conta" no app publicado | A versão nova da função foi publicada, mas o teste completo precisa de uma conta real de teste |
| Terminar a migração (variáveis da Vercel, pausar/excluir o projeto antigo nos EUA) | Ações de painel |
| Simulação de incidente | Exercício de 1 hora, previsto antes de abrir o beta |

### 2.2 Depende de empresa aberta
| Falta | Por que ainda falta |
|---|---|
| Identificar o controlador (razão social, CNPJ, endereço) — Termos e Política ainda com marcadores | Não há empresa; usar dados pessoais do desenvolvedor exigiria decisão consciente e revisão jurídica ⚖ |
| Contratos (DPAs) com Supabase e Vercel e base da transferência internacional | Devem estar no nome do controlador formal; a Res. CD/ANPD nº 19/2024 exige cláusulas-padrão brasileiras ⚖ |
| Encarregado (DPO) designado | Dispensa provisória de agente de pequeno porte, com o canal de contato ativo ⚖; designar antes do lançamento |
| E-mail em domínio próprio para o canal | Exige domínio (custo) e serve para repassar o canal ao Encarregado |

### 2.3 Depende de advogado
| Falta | Por que ainda falta |
|---|---|
| Política de privacidade final e Termos finais | Texto atual é rascunho técnico; a versão v1 completa está em `.lgpd/policies/privacy-policy-v1-draft.md` aguardando revisão |
| Dados de treino (carga, repetições, esforço) são dado de saúde? | Se forem, o cadastro precisa de consentimento específico (art. 11) — decisão jurídica |
| Prazos de 5 anos (prova dos aceites e auditoria) | Propostos pela prescrição do CDC; precisam de validação |
| Marco Civil (guarda de registros de acesso por 6 meses) | Só se aplica a pessoa jurídica com fins econômicos; a política deixou o prazo em aberto |
| ECA Digital: autodeclaração de 18+ basta? | Pode exigir outro mecanismo de idade quando o app abrir ao público |

### 2.4 Depende de dinheiro (planos pagos)
| Falta | Por que ainda falta |
|---|---|
| Backups e logs longos do Supabase (plano Pro) | Plano Free tem logs curtos e backups limitados; não atende prazos de guarda nem recuperação |
| Hospedagem de produção (Cloudflare Pages ou Vercel paga) | Vercel Hobby é para uso não comercial |
| Provedor de e-mail próprio | O e-mail padrão do Supabase é só para testes |
| Proteção contra senhas vazadas | Recurso pago do Supabase Auth |

### 2.5 Depende de funcionalidade que ainda não existe
| Falta | Por que ainda falta |
|---|---|
| Relatório de impacto (RIPD) do módulo de medidas | O módulo ainda não tem tela; o relatório deve ser feito antes de lançá-lo |
| Apagar foto antiga ao trocar/remover | O upload de foto ainda não existe (a exclusão da conta já apaga a pasta) |
| Publicar a política final no app | Depende da revisão jurídica; o caminho já está pronto (nova versão + hash + `/aceite`) |

### 2.6 Melhorias gratuitas opcionais (decididas para depois)
CAPTCHA no cadastro/login (Cloudflare Turnstile), verificação em duas etapas para usuários do app, Content-Security-Policy e âncora externa mensal do registro de auditoria.

---

## 3. Regra prática enquanto isso

Manter o beta **só com convidados que sabem que é um teste**. Antes de abrir para pessoas de fora, resolver o controlador formal, a política revisada, os contratos com fornecedores e os planos pagos (seções 2.2 a 2.4).

## 4. Ao criar uma funcionalidade nova com dados pessoais

1. Respeitar o compromisso de produto do `CLAUDE.md` (sem anúncios, rastreadores, perfilamento, chat, geolocalização ou loot boxes sem nova avaliação).
2. Atualizar `.lgpd/data-map.md`, `.lgpd/legal-basis.md` e `.lgpd/ROPA.md`.
3. Ação sensível do titular → registrar com `audit_log_append` (migration).
4. Texto legal mudou → nova versão em `legal_documents` com o hash do script.

**Perfil social, seguidores e competição (2026-10-18):** avaliados em `.lgpd/RIPD/ripd-social.md` (A017–A019). Toda conta tem um perfil privado (@, nome, foto visíveis na busca). As regras estão nos Termos 0.2 e na Política 0.3, aceitos no cadastro; mostrar treinos a seguidores aprovados ou a todos (perfil aberto) é escolha do titular dentro do serviço (Art. 7º, V). ⚖ Se o jurídico entender que dado de treino é dado de saúde (N1), será preciso um consentimento específico (Art. 11, I), também no cadastro. Medidas nunca são compartilhadas; o ajuste automático de RPE é explicado ao titular (Art. 20). Termos 0.2-dev e Política 0.3-dev publicados no banco em 2026-10-18 (quem já tem conta aceita no /aceite). Pendência: antes do lançamento público, decidir a verificação de idade (risco para adolescentes subiu para médio).

**Avisos no celular — competição e seguidores (2026-10-19):** atividade A020, avaliada na revisão v0.4 do RIPD social (riscos R010–R013). Avisos de seguidores (novo seguidor, pedido, pedido aceito) limitados a 1 por dia por pessoa e tipo. Opt-in por aparelho, desligado por padrão, competição só entre competidores mútuos e só na mudança de posição; conteúdo cifrado para o aparelho (o serviço de push vê só metadados, `.lgpd/vendors/push-services.md`). Inscrição apagada ao desligar, sair da conta, excluir a conta ou quando o serviço de push a recusa; estados só da temporada atual e da anterior. Exportação passa a `guf-export/4`. Política 0.4-dev (rascunho) publicada no banco em 2026-10-19 (`20261019230418_legal_privacy_push_alerts`); quem já tem conta passa pelo /aceite. Avisos de seguidores limitados a 1 a cada 24 h por pessoa e tipo, conferido no gatilho (`20261019232551_push_alerts_follow_cooldown`). ⚖ Pendente: confirmar com o jurídico o papel dos serviços de push e a base da transferência internacional (G8).
