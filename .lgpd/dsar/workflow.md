# Direitos do Titular (DSAR) — Guf App

**Versão**: v1 · **Data**: 2026-10-17 · **Etapa**: F5 (`lgpd-dsar`)
**Resolve**: G10 (canal + prazo) e G12 (exportação completa)
**Canal**: devglaubermonteiro@gmail.com (provisório do beta; `PRIVACY_CONTACT_EMAIL` em `packages/core/src/legal-content.ts`)
**Prazo**: **15 dias corridos** para a resposta completa (LGPD art. 19, II). Mesmo podendo ser agente de pequeno porte, **o guf adota 15 dias** (não usa o prazo em dobro).

> Procedimento técnico. **Não é parecer jurídico** ⚖.

## 1. Os 9 direitos (art. 18) e como o guf atende

| # | Direito | Como | Prazo |
|---|---|---|---|
| I | Confirmação de que tratamos dados | Pelo app (o titular vê os próprios dados) ou e-mail | Na hora / 15 dias |
| II | Acesso | Perfil › Privacidade › **Exportar meus dados** (`export_my_data`, JSON gerado no aparelho) | Na hora |
| III | Correção | Perfil (nome, unidade, meta); treinos e rotinas editáveis nas telas. E-mail da conta: pedido por e-mail | Na hora / 15 dias |
| IV | Anonimização, bloqueio ou eliminação de dados desnecessários | Pedido por e-mail, análise caso a caso | 15 dias |
| V | Portabilidade | O mesmo JSON do acesso (formato `guf-export/2`, estruturado e reutilizável) | Na hora |
| VI | Eliminação | Perfil › Privacidade › **Excluir minha conta** (Edge Function `delete-account`). Exceção: prova mínima dos aceites por 5 anos (`consent_proofs`, art. 16, I ⚖) | Na hora |
| VII | Com quem compartilhamos | Política de privacidade, seção "Com quem compartilhamos" | Na hora |
| VIII | Possibilidade de não consentir | Termo de saúde e política (sem consentimento, só o módulo de medidas fica indisponível) | Na hora |
| IX | Revogação do consentimento | Perfil › Privacidade › **Revogar consentimento** (apaga as medidas na mesma operação) | Na hora |
| Art. 20 | Revisão de decisão automatizada | Finalização automática de treino: desligar no Perfil ou pedir revisão por e-mail | 15 dias |
| Art. 18, § 2º | Oposição | Pedido por e-mail, análise caso a caso | 15 dias |

**Pelo app**: Perfil › Privacidade › **Outros pedidos sobre seus dados** abre o e-mail já com o assunto "Pedido sobre meus dados (LGPD)" (funciona sem internet). O mesmo e-mail aparece no rodapé dos documentos legais e em `/documentos`.

## 2. O que a exportação contém (`guf-export/2`)

`conta` (e-mail, datas de criação/confirmação/último acesso, provedores, dados do cadastro) · `contas_vinculadas` (identidades de login e o que o provedor enviou) · `perfil` · `plano` · `exercicios_personalizados` · `projetos` · `rotinas` · `exercicios_das_rotinas` · `treinos` · `periodos_ativos` · `exercicios_dos_treinos` · `series` · `medidas` · `valores_das_medidas` · `consentimentos` (com documento, versão e hash do texto).

**Não entra**, por segurança da própria conta: hash da senha, tokens, sessões e chaves. Os registros de acesso (IP) ficam nos logs do Supabase/Vercel; se o titular pedir, buscar nos painéis dentro do prazo de retenção desses logs.

Migration: `supabase/migrations/20261017141954_export_my_data_complete.sql`.

## 3. Fluxo dos pedidos por e-mail

1. **Recebeu** → no Gmail, aplicar o marcador `LGPD/aberto` e anotar no controle (seção 4): data de recebimento e **prazo = recebimento + 15 dias**. Criar lembretes no calendário para o **10º** e o **13º** dia.
2. **Confirmar o recebimento** em até 2 dias úteis (modelo A).
3. **Verificar a identidade** com o mínimo necessário:
   - Pedido enviado do mesmo e-mail da conta → suficiente.
   - De outro e-mail → pedir que escreva a partir do e-mail da conta, ou que confirme pelo app logado. **Não pedir documentos** além disso (art. 6º, III).
   - Pedido sobre conta de outra pessoa (ex.: responsável por menor) → avaliar com cuidado; na dúvida, consultar advogado.
4. **Atender**:
   - Se o app resolve (exportar, excluir, revogar, corrigir) → orientar o caminho (modelo B) e oferecer ajuda.
   - Se precisar de ação manual (ex.: corrigir e-mail, anonimizar, oposição) → executar pelo painel/SQL com cuidado e registrar o que foi feito.
   - Se não for possível atender (ex.: dado que não existe, obrigação legal de guarda) → responder dizendo o motivo (art. 18, § 4º).
5. **Responder** dentro do prazo (modelo C), trocar o marcador para `LGPD/concluído` e fechar no controle.

## 4. Controle dos pedidos (onde guardar)

- **Fora do repositório.** O controle contém dados pessoais (e-mail, conteúdo do pedido) e não pode ir para o Git. Usar uma planilha privada (ex.: Google Planilhas na conta do controlador) com as colunas:
  `id (DSAR-AAAA-NNN) · recebido em · canal · direito pedido · identidade verificada em · prazo · respondido em · resultado · observações`
- Guardar por **5 anos** como prova de atendimento.
- Neste repositório, registrar só números agregados (seção 6), sem dados pessoais.

## 5. Modelos de resposta

**A — Confirmação de recebimento**
> Olá! Recebemos seu pedido sobre seus dados no guf em [DATA], com o número [DSAR-AAAA-NNN]. Vamos responder até [PRAZO] (15 dias, conforme a LGPD). Se precisarmos confirmar que o pedido é seu, avisaremos por aqui.

**B — Pedido que o app resolve**
> Olá! Você pode fazer isso agora mesmo no app: Perfil › Privacidade › [Exportar meus dados | Excluir minha conta | Revogar consentimento]. [Detalhe do que acontece.] Se tiver qualquer dificuldade, responda este e-mail que ajudamos.

**C — Conclusão**
> Olá! Seu pedido [DSAR-AAAA-NNN] foi concluído em [DATA]: [o que foi feito]. Se não ficar satisfeito, você também pode procurar a Autoridade Nacional de Proteção de Dados (www.gov.br/anpd).

**D — Não foi possível atender (total ou parcial)**
> Olá! Sobre o pedido [DSAR-AAAA-NNN]: não foi possível [ação] porque [motivo — ex.: obrigação legal de guarda por X, até DATA]. [O que foi feito no lugar.] Você pode procurar a ANPD (www.gov.br/anpd) se discordar.

## 6. Indicadores (sem dados pessoais)

| Período | Recebidos | Concluídos no prazo | Fora do prazo | Abertos |
|---|---|---|---|---|
| até 2026-10-17 | 0 | 0 | 0 | 0 |

## 7. Pendências

- Designar o Encarregado antes do lançamento e trocar o e-mail provisório por um endereço dedicado (ex.: `privacidade@<domínio>`), que possa ser repassado sem expor a conta pessoal.
- Atualizar o texto dos documentos legais (hoje com `[E-MAIL DO ENCARREGADO]`) na publicação da política v1 (F4, após revisão jurídica).
- Log de auditoria das ações do titular (exportar, excluir, revogar) — F6 (`lgpd-audit-logging`, G19).
- Apagar do Storage a foto enviada ao excluir a conta, quando o upload existir (G18).
