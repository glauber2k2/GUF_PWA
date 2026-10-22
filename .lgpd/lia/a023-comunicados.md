# LIA — Comunicados de produto no app (A023, finalidade "Produto")

## Identificação
- **Atividade**: A023 — comunicados que a equipe publica pelo painel; esta LIA cobre só a finalidade **Produto** (novidades e ofertas do próprio guf). Serviço (Art. 7º, V) e Legal (Art. 7º, II; Art. 9º) não dependem dela.
- **Controlador**: [RAZÃO SOCIAL] (pendente — G22)
- **Data**: 2026-10-22
- **Versão**: 0.1 (rascunho técnico, **sem validação jurídica** ⚖)
- **Próxima revisão**: antes do primeiro comunicado de produto e a cada 12 meses

## 1. Teste de finalidade
- **Interesse perseguido**: contar a quem usa o app sobre funções novas do guf e sobre o plano Pro.
- **Lícito, específico e real?** Sim: comunicação do próprio serviço a quem já o usa (não é publicidade de terceiros).
- **Quem se beneficia?** O titular (descobre funções que já tem) e o controlador.

## 2. Teste de necessidade
- **Dados usados**: só o necessário para escolher o público — plano, data de criação da conta, visibilidade do perfil ou lista de ids. **Nunca** consentimento de saúde (o banco recusa, GA009), treinos, cargas ou qualquer perfil de comportamento.
- **Alternativa menos invasiva?** Público "Todos" quando possível; segmentação só para não mostrar o que não se aplica (ex.: oferta do Pro para quem já é Pro).
- **Métricas**: só totais (vistos, fechados, cliques); sem lista de quem viu.

## 3. Teste de balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável do titular | Média-alta: avisos de novidades dentro do app são comuns |
| Impacto potencial sobre direitos | Leve (aviso dentro do app, sem e-mail ou push) |
| Categoria do dado | Comum |
| Vulnerabilidade do titular | Público 18+ por autodeclaração; ECA Digital veda perfilamento publicitário de menores — sem segmentação comportamental (Arts. 22 e 26) |
| Frequência | No máximo 1 aviso que interrompe por abertura; "Mostrar uma vez" como padrão para produto |
| Salvaguardas | Fora do treino e das telas imersivas; "Agora não" sempre visível; auditoria de publicação |

## 4. Salvaguardas obrigatórias antes do primeiro envio
- [ ] Política de Privacidade com a seção de comunicados no app e o direito de não receber os de produto (nova versão).
- [ ] Opção "Receber novidades no app" em Configurações (desligar = público de produto exclui a pessoa; precisa de migration e regra no `my_announcements`).
- [ ] Revisão desta LIA por advogado especializado ⚖.

## 5. Conclusão provisória
Legítimo interesse **provável**, condicionado às salvaguardas da seção 4. Até lá, a equipe publica só comunicados de **Serviço** e **Legal**.
