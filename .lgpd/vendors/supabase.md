# Operador: Supabase

- Razão social / registro: Supabase, Inc. (EUA) — **confirmar no DPA**
- País(es) de tratamento: **Brasil** — projeto `GUF DEV` (ref `yscoujsisrytytqsxkya`) na região **`sa-east-1` (São Paulo)** desde 2026-10-16. Antes: projeto `GUF` (ref `hpghcddtezunlvoybivb`) em `us-west-2` (EUA), a ser pausado e excluído após a validação. A empresa é americana e a infraestrutura roda sobre a AWS (sub-operador); suporte e sub-operadores podem tratar dados fora do Brasil
- Finalidade: banco de dados, autenticação, e-mails de confirmação/recuperação (SMTP padrão), Edge Function `delete-account`, job pg_cron, logs
- Dados compartilhados: **todos** — conta, perfil, treinos, consentimentos, registros de acesso e, quando o módulo existir, **medidas corporais** | Sensíveis (Art. 11)? **Sim** (A010)
- Tier: **Crítico**
- Plano: **Free** (desenvolvimento)
- Owner interno: Glauber
- Última revisão: 2026-10-16 | Próxima revisão: 2027-01-16 (trimestral)

## 1. Contrato e base legal
- [ ] 🚫 **DPA aceito/assinado** — não feito. Verificar o DPA no site/painel do Supabase e arquivar a cópia aqui
- [x] Papel: operador (trata conforme as instruções do controlador)
- [x] Finalidade compatível com o mapa de dados (A001–A014)
- [x] Base legal do compartilhamento: a mesma de cada atividade (`legal-basis.md`)

## 2. Segurança (Art. 46)
- [x] TLS em trânsito
- [ ] Criptografia em repouso — declarada pelo fornecedor; confirmar na documentação de segurança
- [ ] MFA na conta do desenvolvedor no painel do Supabase — **verificar e ativar**
- [ ] Certificações (ex.: SOC 2 Tipo II) — o fornecedor divulga; baixar o relatório do trust center para confirmar validade
- [ ] Logs de acesso: **no plano Free a retenção é curta** (confirmar o prazo na página de preços) — não atende os 6 meses prometidos na política (G9)

## 3. Sub-operadores
- [ ] Baixar a lista de sub-operadores (ex.: AWS; provedor do SMTP padrão) e registrar aqui
- [ ] Confirmar se há aviso prévio de novos sub-operadores

## 4. Transferência internacional
- [ ] 🚫 **Base do Art. 33** — nenhuma definida (G8). Opções: cláusulas-padrão brasileiras da Res. 19/2024 (exige negociação com o fornecedor) ou migrar o projeto para `sa-east-1` (São Paulo) ⚖
- [x] País de destino mapeado: EUA

## 5. Direitos do titular e retenção
- [x] Exportar e excluir funcionam pelo app (RPC + Edge Function)
- [ ] **Backups**: confirmar se o plano Free tem backups e por quanto tempo; no Pro, definir o prazo e citar na política (G15)
- [ ] Eliminação ao fim do contrato: verificar a cláusula no DPA

## 6. Incidentes
- [ ] Prazo de notificação de incidente pelo fornecedor: verificar no DPA
- [ ] Histórico de incidentes: pesquisar antes de produção
- [ ] Canal de segurança do fornecedor: registrar aqui

## 7. Operacional
- [ ] Cópia do DPA versionada nesta pasta
- [x] Revisão trimestral agendada
- [x] Owner definido

## Observações do plano Free
- **SMTP padrão**: o próprio Supabase avisa que é para testes, com limite baixo de envios. Antes de produção, configurar um provedor de e-mail próprio — e ele entra nesta pasta como novo operador.
- O Free não é adequado para produção com dados sensíveis (logs curtos, backups limitados). Migrar para o Pro antes de abrir o beta ou de lançar o módulo de medidas.

## Avaliação — Supabase
- Itens atendidos: 6/20
- Eliminatórios (🚫): **REPROVADO em DPA e base do Art. 33** (pendências, não falhas do fornecedor)
- Veredito: **APROVADO COM RESSALVAS** para desenvolvimento; **bloqueado para usuários reais** até resolver os dois eliminatórios
- Gaps abertos: G7, G8, G9, G15, G16, G22
