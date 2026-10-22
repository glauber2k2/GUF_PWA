# RIPD — Medidas corporais · A010

**Versão**: 0.1 (rascunho técnico, **sem revisão jurídica** ⚖) · **Data**: 2026-10-22 · **Branch**: `feat/medidas-corporais`
**Metodologia**: mesma do `ripd-social.md` e do `ripd-guf-ai.md` (descrição → necessidade → riscos → medidas → decisão). Enquadramento de risco pela Res. CD/ANPD nº 2/2022, Art. 4º: critério específico presente (dado sensível, Art. 5º, II); critério geral (larga escala ou efeito relevante sobre direitos) **ainda não** — beta com testadores convidados. Fazer o RIPD mesmo assim, antes de lançar a tela (gap G17).

## 1. O que é
Área privada do **próprio perfil** (Perfil › "Medidas corporais", selo "Só você") onde a pessoa registra, com data, circunferências em centímetros e acompanha a evolução: lista por músculo com a variação de 3 meses, gráfico por músculo (lado esquerdo/direito), registros e nova medição (hoje ou outro dia).

**Fluxo**: app → `getBodyMeasurements` (RLS: só o dono) → tela. Gravação: app → RPC `save_body_measurement` (SECURITY INVOKER: RLS + `has_health_consent()` vigente; uma medição por dia, o mesmo dia substitui os valores; `null` apaga um valor, usado pelo "Desfazer") → `body_measurements` / `measurement_values`.

**Consentimento**: na primeira entrada em "Medidas corporais", a tela de autorização em camadas (resumo de 5 itens sempre visível, termo completo no leitor, caixa desmarcada, "Agora não" e "Autorizar e continuar" com o mesmo peso) → `grant_health_consent` (registro com documento, versão e hash). Nada é pedido no cadastro nem no meio de outro fluxo; o resto do app funciona sem ele.

## 2. Dados tratados
| Dado | Onde | Quem vê | Observação |
|---|---|---|---|
| Circunferências (cm) por local: bíceps, antebraço, coxa e panturrilha (E/D), peitoral, ombros, abdômen, quadril | `measurement_values` | **Só o titular** | Dado referente à saúde (Art. 5º, II). Pescoço e cintura existem no banco, sem tela |
| Data da medição | `body_measurements.measured_on` | Só o titular | Uma por dia |
| Peso e % de gordura | Colunas existentes em `body_measurements` | — | **Não coletados** (sem tela, minimização — Art. 6º, III). Saíram do Termo de Saúde 0.2-dev e da Política 0.7-dev |
| Consentimento de saúde | `consent_records` | Só o titular (e prova pós-exclusão em `consent_proofs`) | Revela o uso do módulo, não o valor |
| Eventos de eliminação | `audit_log` (`health_data_deleted`, só a contagem) | Ninguém pelo app | Sem valores |

**Base legal**: **Art. 11, I** — consentimento específico e destacado, para a finalidade única de acompanhar a própria evolução ⚖. Nenhuma hipótese do Art. 11, II se aplica.

**Não acontece**: medidas no perfil social, para seguidores, na competição, no GUF AI (nenhuma ferramenta lê estas tabelas), em notificações, na cópia offline do aparelho (sem `withDeviceCache`; só a memória do TanStack Query, limpa ao sair da conta), em logs, analytics ou stories.

## 3. Necessidade e proporcionalidade
- Finalidade pedida pelo titular, opcional e sem efeito sobre o resto do serviço (consentimento livre — Art. 8º, § 4º).
- Coleta mínima: só o que a pessoa digita; nada calculado ou inferido; nenhum dado de outra pessoa.
- Online apenas: o dado sensível não fica guardado no aparelho (perda/roubo do celular, aparelho compartilhado).

## 4. Riscos e medidas
| Risco | Nível | Medidas |
|---|---|---|
| R1 · Outra pessoa ver as medidas (perfil, seguidores, competição) | Baixo | RLS "medidas: ler as próprias" (testado: outra conta lê 0 linhas e não grava); o botão só existe no perfil próprio, sem aviso de "conteúdo oculto" no perfil de outra pessoa; nenhuma função social/competição/IA consulta as tabelas |
| R2 · Gravar sem consentimento válido (ou com termo desatualizado) | Baixo | Políticas de insert/update exigem `has_health_consent()` da **versão vigente**; a RPC confere antes (erro GM001); nova versão do termo exige nova autorização |
| R3 · Revogação que não apaga | Baixo | `revoke_health_consent` grava a revogação e apaga as medidas na mesma transação (testado); auditoria `health_data_deleted`; a tela de Configurações recarrega |
| R4 · Medidas no aparelho (perda, aparelho compartilhado) | Baixo | Sem cópia no IndexedDB; cache só em memória; "Sair" limpa o cache |
| R5 · Envio a terceiros (IA, analytics, logs) | Baixo | GUF AI sem acesso (Termo 0.2-dev diz isso); sem analytics no app; regra "nunca enviar medidas para logs" (CLAUDE.md, `packages/api/src/profile.ts`) |
| R6 · Público menor de idade (ECA Digital, Art. 14 LGPD) | Médio ⚖ | Público 18+ por autodeclaração; conta de menor identificada é excluída. A decisão sobre verificação de idade (eca-digital.md, seção 4) continua pré-requisito do lançamento público |
| R7 · Dado incorreto (qualidade, Art. 6º, V) | Baixo | Validação no app e no banco (0 < cm < 300, uma casa); editar o registro (menu do registro) ou registrar de novo o mesmo dia corrige; excluir pede confirmação; "Desfazer" logo após salvar ou excluir |
| R8 · Banco fora do Brasil | Baixo | Supabase em `sa-east-1` (São Paulo) desde 2026-10-16 |
| R9 · Equipe ver ou usar o status do consentimento (painel, 2026-10-22) | Baixo | O painel mostra só sim/não, e só aos papéis Suporte e Admin; nenhuma função `admin_*` lê as tabelas de medidas. Público de comunicado por consentimento só com finalidade legal ou serviço: o banco recusa "produto" (GA009), porque usar o status para oferta seria finalidade nova (Art. 6º, I) |

## 5. Direitos do titular
- **Acesso e portabilidade** (Art. 18, II e V): "Exportar meus dados" inclui `medidas` e `valores_das_medidas`.
- **Correção** (III): menu do registro › Editar, ou registrar de novo o mesmo dia (substitui os valores).
- **Eliminação e revogação** (VI e IX): menu do registro › Excluir (tela do músculo, com confirmação) apaga aquele músculo naquele dia, com "Desfazer" logo em seguida; Configurações › Privacidade › "Revogar consentimento" apaga tudo na hora; excluir a conta apaga em cascata.
- **Informação** (Art. 9º): Termo de Saúde 0.2-dev (resumo em camadas) e Política 0.7-dev, seção "Dados de saúde".

## 6. Pendências
- [ ] Revisão jurídica do Termo de Saúde e da Política ⚖
- [ ] Antes do lançamento público: decisão de verificação de idade (ECA Digital) e Encarregado (o dado sensível em escala tira a dispensa do Art. 11 da Res. 2/2022)
- [ ] Remover por migration as colunas `body_weight_kg` e `body_fat_pct` se continuarem sem uso (minimização)

## 7. Decisão
**Prosseguir em beta** com as medidas acima (implementadas e testadas em 2026-10-22). Não abrir ao público sem os itens de lançamento da seção 6. Próxima revisão: antes do lançamento público ou quando o módulo ganhar dado novo (peso, % de gordura, fotos).
