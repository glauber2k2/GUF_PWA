# LIA — Registros de segurança e prevenção a fraude (A012-b)

## Identificação
- **Atividade**: A012 (b) — logs de autenticação e acesso usados para segurança
- **Controlador**: [RAZÃO SOCIAL] (pendente — G1)
- **Data**: 2026-10-16
- **Versão**: 1 (rascunho técnico)
- **Próxima revisão**: 2027-04-16 ou ao trocar de operador de hospedagem/autenticação

## 1. Teste de finalidade
- **Interesse perseguido**: proteger as contas contra acesso indevido, abuso (força bruta, criação em massa) e investigar incidentes.
- **Lícito, específico e real?** Sim. É um dever de segurança do controlador (Art. 46) e o insumo do runbook de incidente (Res. CD/ANPD nº 15/2024).
- **Quem se beneficia?** O titular (conta protegida), o controlador e os demais usuários.
- **Prejuízo sem o tratamento**: impossibilidade de detectar invasões e de cumprir o registro de incidentes (Res. 15/2024, Art. 10).

## 2. Teste de necessidade
- **Estritamente necessário?** Sim, limitado aos eventos de autenticação e de acesso (Art. 10, II).
- **Alternativa menos invasiva?** Não usar os logs para nenhuma outra finalidade (sem analytics, sem perfil de uso).
- **Dados mínimos?** IP, data/hora, user-agent e tipo de evento. Sem conteúdo de treinos ou medidas (Art. 6º, III).

## 3. Teste de balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável do titular | Alta: é prática comum e esperada em apps com login |
| Impacto potencial sobre direitos | Leve |
| Categoria do dado | Comum (IP pode identificar indiretamente) |
| Vulnerabilidade do titular | Nenhuma esperada (público 18+; ver G11) |
| Forma de coleta | Observada, informada na política |
| Salvaguardas | Acesso restrito ao painel, retenção limitada, nenhum uso secundário |

**Conclusão**: o interesse do controlador **prevalece**, porque o tratamento é mínimo, esperado, protege o próprio titular e não gera efeitos sobre ele além da segurança.

## 4. Salvaguardas
- [ ] Transparência ativa (incluir na política — L9)
- [x] Minimização de dados (só eventos de acesso)
- [ ] Limitação de retenção (definir e configurar — G9)
- [ ] Acesso restrito: confirmar MFA nas contas administradoras do Supabase e da hospedagem
- [x] Criptografia em trânsito (TLS)
- [x] Nenhum uso para publicidade ou perfilamento

## 5. RIPD necessário?
Não: sem perfilamento, sem dado sensível, sem larga escala.

## 6. Decisão
- [ ] Aprovo o uso de legítimo interesse para esta atividade
- [ ] Rejeito — recomendo migrar para {outra base}

**Responsável pela decisão**: Encarregado / Jurídico (pendente)
**Data**: —
