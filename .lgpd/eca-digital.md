# ECA Digital (Lei nº 15.211/2025) — Avaliação do Guf App

**Versão**: 0.1 (rascunho) · **Avaliação em**: 2026-10-17 · **Próxima revisão**: 2027-04-17 ou antes do lançamento público
**Etapa**: F13 (`lgpd-eca-digital-minors`) · **Lacuna**: G11
**Situação**: ⏸ rascunho técnico, **sem revisão jurídica** (adiada por falta de orçamento). Não é parecer. O alcance de vários artigos — em especial a exigência de verificação de idade e a vedação da autodeclaração — **precisa ser confirmado no texto da lei e na regulamentação da ANPD** ⚖.

## 1. Aplicabilidade

| Pergunta | Resposta no guf |
|---|---|
| O produto é direcionado a menores? | **Não.** Os Termos e o cadastro exigem 18 anos ou mais |
| Há **acesso provável** por adolescentes? | **Possível.** Musculação é praticada por adolescentes, o app é gratuito, aberto na web e não verifica idade além da autodeclaração |
| Faixa etária mínima nos termos | 18+ |
| Estatística própria de menores | Não há (a idade não é coletada) |
| Escala | Beta com testadores convidados; muito abaixo de 1 milhão de usuários menores (relatório semestral do Art. 31 não se aplica) |

**Conclusão provisória**: o guf **não é direcionado a menores**, mas pode ser considerado de **acesso provável** quando for aberto ao público. Enquanto o beta for só para convidados adultos que sabem que é um teste, o risco é baixo. **Antes do lançamento público**, decidir com um advogado se a autodeclaração basta ou se é preciso outro mecanismo de idade ⚖.

## 2. Obrigações x situação atual

| Tema | O que a lei trata (segundo a análise da skill — conferir ⚖) | Situação no guf | Risco |
|---|---|---|---|
| Verificação de idade | Mecanismos confiáveis; autodeclaração vedada nos casos exigidos | **Só autodeclaração** (caixa "Tenho 18 anos ou mais", desmarcada, no cadastro e no `/aceite`) | **Principal lacuna** se a lei se aplicar ao guf |
| Vinculação a responsável (até 16 anos) | Conta vinculada a responsável | Não existe (público 18+) | Depende da aplicabilidade |
| Perfilamento publicitário de menores | Vedado | **Não há publicidade, analytics, rastreadores nem perfilamento** | Baixo |
| Caixas de recompensa (loot boxes) | Vedadas | **Não existem** (sem compras, sem sorteios). Sequência e recordes são métricas do próprio treino, sem prêmio aleatório | Baixo |
| Supervisão parental (tempo, recomendação, contato com estranhos, geolocalização) | Controles para responsáveis | Sem chat, sem rede social, sem contato entre usuários, sem geolocalização, sem recomendação algorítmica de conteúdo | Baixo |
| Conteúdo ilícito / denúncia | Remoção e comunicação | Não há conteúdo publicado por usuários para outros usuários (os Stories são imagens geradas no aparelho e compartilhadas pelo próprio usuário fora do app) | Baixo |
| Relatório de transparência | Acima de 1 milhão de usuários menores | Não se aplica | — |
| Dados de saúde de menores (medidas) | LGPD Art. 14 (melhor interesse) + dado sensível | Módulo de medidas ainda sem tela; público 18+ | Médio no lançamento do módulo — tratar no RIPD (F12) |

## 3. Medidas sem custo adotadas agora

1. **Público 18+ mantido** com confirmação explícita e desmarcada no cadastro e no `/aceite` (já existia).
2. **Compromisso de produto** (registrado no `CLAUDE.md`): não adicionar publicidade, analytics, rastreadores, perfilamento, chat/contato entre usuários, geolocalização ou mecânicas de recompensa aleatória sem nova avaliação LGPD/ECA Digital.
3. **Procedimento para conta de menor identificada** (por denúncia, contato do responsável ou do próprio usuário):
   1. Registrar o pedido no controle de DSAR (`.lgpd/dsar/workflow.md`), sem pedir documentos além do necessário.
   2. Responder ao responsável/titular em até 15 dias.
   3. Excluir a conta pelo fluxo normal (o banco guarda só a prova mínima dos aceites e o registro de auditoria, sem dados de treino).
   4. Registrar no `audit_log` (automático) e anotar o caso, sem dados pessoais, na seção 5 deste arquivo.
4. **Política de privacidade** (rascunho v1, seção 11) já diz que o serviço é 18+ e como o responsável pode pedir a exclusão.

## 4. Opções para antes do lançamento público (decidir com advogado)

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| Manter autodeclaração + medidas da seção 3 | Zero | Sem coleta extra | Pode não bastar se o guf for considerado de acesso provável ⚖ |
| Pedir ano de nascimento no cadastro | Zero | Barreira um pouco maior; permite bloquear menores declarados | Continua sendo autodeclaração; coleta um dado a mais |
| Sinal de idade da loja (app iOS/Android futuro) | Zero ou baixo | Verificação delegada ao sistema/loja | Só no app nativo, não no PWA |
| Verificação por documento/biometria com fornecedor especializado | **Pago** | Mais robusto | Custo, mais dados pessoais (inclusive sensíveis), novo operador |
| Abrir para 13–17 com vinculação a responsável | Alto (desenvolvimento) | Atende o público adolescente | Complexidade jurídica e técnica; dados de saúde de menores |

**Recomendação provisória**: manter 18+ com a seção 3 durante o beta; antes do lançamento, levar a primeira e a segunda opção ao advogado junto com o rascunho da política (F4) e do ROPA (F10).

## 5. Registro de casos (sem dados pessoais)

| Data | Situação | Ação | Prazo cumprido? |
|---|---|---|---|
| — | Nenhum caso até 2026-10-17 | — | — |

## 6. Riscos residuais

- Adolescente que mente a idade consegue usar o app (limitação da autodeclaração).
- Se o módulo de medidas for lançado com público possivelmente menor, aumenta o risco (dado sensível) — reavaliar no RIPD.
- Mudança de produto que introduza contato entre usuários, ranking público ou publicidade muda esta análise.

## 7. Responsável

Controlador (desenvolvedor, pessoa natural) até a designação do Encarregado.
