# Bases Legais por Atividade de Tratamento — Guf App

**Última atualização**: 2026-10-16
**Status**: proposta técnica, **pendente de validação jurídica** ⚖ (não é parecer)
**Fonte das atividades**: `.lgpd/data-map.md` v1

## Resumo

| ID | Atividade | Base legal | Revogável pelo titular? |
|---|---|---|---|
| A001 | Cadastro e autenticação por e-mail | Art. 7º, V — contrato | Não (encerrar = excluir conta) |
| A002 | Login com Google | Art. 7º, V — contrato | Sim, na prática: pode deixar de usar o Google |
| A003 | Aceites e consentimentos | Art. 7º, II — obrigação legal; após a exclusão, Art. 7º, VI ⚖ | Não |
| A004 | Perfil e preferências | Art. 7º, V | Não (editável) |
| A005 | Foto do perfil | Art. 7º, V | Sim, a foto é opcional |
| A006 | Planejamento de treinos | Art. 7º, V | Não (pode apagar) |
| A007 | Registro de treinos | Art. 7º, V ⚖ (ver N1) | Não (pode apagar) |
| A008 | Finalização automática | Art. 7º, V | Sim (desligar a opção) |
| A009 | Histórico e evolução | Art. 7º, V | Não |
| A010 | Medidas corporais | **Art. 11, I — consentimento específico e destacado** | **Sim** (revogar apaga tudo) |
| A011 | Dados no aparelho | Art. 7º, V | Sim (sair da conta limpa) |
| A012 | Registros de acesso e segurança | Art. 7º, II (Marco Civil, art. 15) + Art. 7º, IX (LIA) | Oposição limitada |
| A013 | Exportação de dados | Art. 7º, II (Art. 18, II e V) | — |
| A014 | Exclusão de conta | Art. 7º, II (Art. 18, VI) | — |
| A015 | Planos e pagamentos (futuro) | Art. 7º, V; dados fiscais Art. 7º, II | Não |
| A016 | Registro de auditoria | Art. 7º, II; após a exclusão, Art. 7º, VI ⚖ | Não |

**Totais**: 1 atividade com consentimento (A010) · 1 com legítimo interesse (A012, LIA em `.lgpd/lia/a012-seguranca.md`) · 10 com execução de contrato · 4 com obrigação legal (A003, A012, A013, A014; A015 parcial) · 1 com exercício regular de direitos (A003 após a exclusão).

---

## A001 — Cadastro e autenticação por e-mail <a id="a001"></a>

- **Finalidade**: criar a conta, autenticar e recuperar o acesso.
- **Dados tratados**: e-mail, senha (hash), nome opcional, plataforma de cadastro, declaração de idade.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, V — execução de contrato (Termos de Uso).
- **Justificativa**: sem conta não é possível prestar o serviço contratado; consentimento seria inadequado porque o titular não poderia recusar e continuar usando o app.
- **Observação**: a declaração de idade (18+) é condição contratual. Reavaliar depois da análise do ECA Digital (G11), que pode exigir verificação além da autodeclaração ⚖.
- **Retenção**: enquanto a conta existir; eliminação imediata ao excluir.
- **Revogação possível?**: Não; o titular encerra excluindo a conta.
- **Última revisão**: 2026-10-16

## A002 — Login com Google e vinculação de conta <a id="a002"></a>

- **Finalidade**: entrar com a conta Google e vincular a uma conta de e-mail já existente.
- **Dados tratados**: nome, e-mail, URL da foto e identificador Google.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, V.
- **Justificativa**: forma de autenticação escolhida pelo titular para executar o contrato; o app só recebe o mínimo do escopo padrão (nome, e-mail, foto).
- **Retenção**: enquanto a conta existir.
- **Revogação possível?**: o titular pode remover o acesso do guf na conta Google e entrar com e-mail/senha.
- **Última revisão**: 2026-10-16

## A003 — Registro de aceites e consentimentos <a id="a003"></a>

- **Finalidade**: comprovar que o titular aceitou Termos, Política e declaração de idade, e que deu ou revogou o consentimento de saúde.
- **Dados tratados**: id do usuário, documento/versão, ação, origem, plataforma e data/hora.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, II — o ônus de provar que o consentimento foi obtido conforme a lei é do controlador (Art. 8º, § 2º). Após a exclusão da conta, uma prova mínima poderia ser guardada com base no Art. 7º, VI (exercício regular de direitos) e no Art. 16, I ⚖.
- **Justificativa**: o registro existe para cumprir a lei, não para uma finalidade comercial.
- **Retenção**: hoje é apagado com a conta (G6). **Proposta**: guardar prova mínima (hash do id, documento, versão, ação, data), sem dados de treino, pelo prazo que o jurídico definir ⚖.
- **Revogação possível?**: Não. Revogar um consentimento gera um novo registro, nunca apaga o anterior.
- **Última revisão**: 2026-10-16

## A004 — Perfil e preferências da conta <a id="a004"></a>

- **Finalidade**: personalizar o app (nome, unidade de peso, meta semanal, fuso, finalização automática).
- **Dados tratados**: campos de `profiles`.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, V.
- **Justificativa**: preferências necessárias para exibir o serviço conforme o titular escolheu.
- **Retenção**: enquanto a conta existir.
- **Revogação possível?**: Não; todos os campos são editáveis no Perfil.
- **Última revisão**: 2026-10-16

## A005 — Foto do perfil <a id="a005"></a>

- **Finalidade**: exibir a foto do titular no app.
- **Dados tratados**: URL da foto do Google; no futuro, arquivo enviado.
- **Sensíveis?**: Não. A imagem não é usada para reconhecimento facial nem biometria; se isso mudar, vira dado sensível (Art. 5º, II) e exige Art. 11.
- **Base legal**: Art. 7º, V.
- **Justificativa**: recurso do serviço, opcional; sem foto, o app mostra a inicial.
- **Retenção**: enquanto a conta existir; o arquivo enviado deve ser apagado do Storage na exclusão (G18).
- **Revogação possível?**: Sim, removendo a foto (quando o upload existir).
- **Última revisão**: 2026-10-16

## A006 — Planejamento de treinos <a id="a006"></a>

- **Finalidade**: guardar projetos, rotinas e exercícios planejados ou criados pelo titular.
- **Dados tratados**: nomes, descrições, observações, dias da semana, séries/reps/descanso.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, V.
- **Justificativa**: é o núcleo do serviço contratado.
- **Retenção**: enquanto a conta existir; o titular pode apagar a qualquer momento.
- **Revogação possível?**: Não (o titular apaga o conteúdo).
- **Última revisão**: 2026-10-16

## A007 — Registro de treinos <a id="a007"></a>

- **Finalidade**: registrar os treinos feitos (exercícios, séries, carga, repetições, tipo de série, pausas e duração).
- **Dados tratados**: data local, horários, períodos ativos, carga, reps, RPE e observações.
- **Sensíveis?**: Não, na leitura atual ⚖.
- **Base legal**: Art. 7º, V.
- **Justificativa**: é a funcionalidade principal do app; o titular registra por vontade própria para acompanhar a própria evolução.
- **Risco (N1)**: se o jurídico entender que carga, repetições e esforço percebido (RPE), combinados, são dados referentes à saúde, a base precisaria migrar para o Art. 11, I (consentimento específico), já que o Art. 7º, V não vale para dados sensíveis. **Decisão necessária antes de produção** ⚖.
- **Retenção**: enquanto a conta existir; o titular pode excluir treinos concluídos.
- **Revogação possível?**: Não (o titular apaga o conteúdo).
- **Última revisão**: 2026-10-16

## A008 — Finalização automática de treino ocioso <a id="a008"></a>

- **Finalidade**: encerrar treinos esquecidos abertos, só para quem ligou a opção.
- **Dados tratados**: horários das séries e status do treino.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, V — funcionalidade opcional pedida pelo titular.
- **Justificativa**: decisão automatizada de baixo impacto, desligada por padrão e reversível. O Art. 20 garante pedir revisão de decisões automatizadas que afetem os interesses do titular; recomenda-se explicar a regra na política (Art. 20, § 1º — critérios da decisão).
- **Retenção**: igual a A007.
- **Revogação possível?**: Sim (desligar no Perfil).
- **Última revisão**: 2026-10-16

## A009 — Histórico, evolução e estatísticas <a id="a009"></a>

- **Finalidade**: mostrar calendário, sequência, volume, 1RM estimado e recordes pessoais.
- **Dados tratados**: dados derivados de A007.
- **Sensíveis?**: Não (mesma ressalva N1).
- **Base legal**: Art. 7º, V.
- **Justificativa**: a evolução é parte do serviço contratado; os cálculos não são usados para publicidade nem compartilhados.
- **Retenção**: calculado sob demanda; não há armazenamento próprio além da cópia local.
- **Revogação possível?**: Não.
- **Última revisão**: 2026-10-16

## A010 — Medidas corporais <a id="a010"></a>

- **Finalidade**: acompanhar peso, % de gordura e circunferências ao longo do tempo.
- **Dados tratados**: data, peso, % de gordura, 14 circunferências e observação.
- **Sensíveis?**: **Sim** — dado referente à saúde (Art. 5º, II).
- **Base legal**: **Art. 11, I** — consentimento específico e destacado, para finalidade específica.
- **Justificativa**: nenhuma das hipóteses do Art. 11, II se aplica (não há obrigação legal, tutela da saúde por profissional nem prevenção a fraude). O módulo é opcional e o restante do app funciona sem ele, então o consentimento é livre (o serviço não depende dele).
- **Conformidade atual**: resumo em camadas sempre visível, termo completo, caixa desmarcada, botões "Agora não" / "Autorizar e continuar" com o mesmo peso, registro com versão e hash, RLS que bloqueia gravação sem consentimento ativo.
- **Pendências**: G13 (impedir revogação gravada sem apagar as medidas) e G17 (RIPD antes de lançar a tela).
- **Retenção**: até revogar (apaga na hora) ou excluir a conta.
- **Revogação possível?**: **Sim**, a qualquer momento pelo Perfil (Art. 8º, § 5º; Art. 18, IX).
- **Última revisão**: 2026-10-16

## A011 — Dados guardados no aparelho <a id="a011"></a>

- **Finalidade**: permitir treinar sem internet e abrir o app rápido.
- **Dados tratados**: sessão, treino em andamento, fila offline, cópias de histórico e preferências.
- **Sensíveis?**: Não (as medidas não são guardadas offline hoje; reavaliar quando a tela existir).
- **Base legal**: Art. 7º, V.
- **Justificativa**: armazenamento estritamente necessário para a funcionalidade offline; não há cookies de terceiros nem rastreamento.
- **Retenção**: até sair da conta.
- **Revogação possível?**: Sim (sair da conta ou limpar os dados do navegador).
- **Última revisão**: 2026-10-16

## A012 — Registros de acesso e segurança <a id="a012"></a>

- **Finalidade**: (a) guardar registros de acesso pelo prazo legal; (b) segurança e prevenção a fraude.
- **Dados tratados**: IP, data/hora, user-agent e eventos de login.
- **Sensíveis?**: Não.
- **Base legal**: (a) Art. 7º, II — guarda de registros de acesso a aplicações por 6 meses (Marco Civil da Internet, Lei 12.965/2014, art. 15), se o guf for provedor de aplicação constituído como pessoa jurídica com fins econômicos ⚖; (b) Art. 7º, IX — legítimo interesse, com LIA em [`.lgpd/lia/a012-seguranca.md`](./lia/a012-seguranca.md).
- **Justificativa**: proteger a conta do titular é do interesse dele e do controlador; os dados são mínimos e não são usados para outra finalidade.
- **Retenção**: (a) 6 meses; (b) definir (proposta: o mesmo prazo). **Hoje não está garantida** (G9).
- **Revogação possível?**: (a) Não; (b) oposição (Art. 18, § 2º), avaliada caso a caso.
- **Última revisão**: 2026-10-16

## A013 — Exportação de dados <a id="a013"></a>

- **Finalidade**: atender acesso e portabilidade.
- **Base legal**: Art. 7º, II — cumprir o Art. 18, II e V.
- **Sensíveis?**: Sim, se houver medidas (o tratamento é feito a pedido do próprio titular).
- **Retenção**: nada fica no servidor.
- **Última revisão**: 2026-10-16

## A014 — Exclusão de conta <a id="a014"></a>

- **Finalidade**: atender a eliminação.
- **Base legal**: Art. 7º, II — cumprir o Art. 18, VI; exceções do Art. 16 (ver A003).
- **Sensíveis?**: Sim, se houver medidas.
- **Retenção**: eliminação imediata no banco; backups e Storage pendentes (G15, G18).
- **Última revisão**: 2026-10-16

## A015 — Planos e pagamentos (futuro) <a id="a015"></a>

- **Finalidade**: liberar recursos pagos e cumprir obrigações fiscais.
- **Base legal**: Art. 7º, V (assinatura); Art. 7º, II (documentos fiscais) ⚖.
- **Sensíveis?**: Não. Dados de cartão ficam no gateway, nunca no banco do guf.
- **Retenção**: definir antes de monetizar, com o contador e o jurídico ⚖.
- **Última revisão**: 2026-10-16

## A016 — Registro de auditoria <a id="a016"></a>

- **Finalidade**: comprovar o atendimento dos direitos e o histórico de consentimentos (responsabilização) e apoiar a apuração de incidentes.
- **Dados tratados**: id interno da conta, evento, data/hora, documento/versão e contagens. Sem e-mail, nome, IP ou conteúdo.
- **Sensíveis?**: Não.
- **Base legal**: Art. 7º, II — demonstrar a adoção de medidas eficazes (Art. 6º, X) e registrar incidentes (Res. 15/2024, Art. 10). Após a exclusão da conta, Art. 7º, VI (exercício regular de direitos) ⚖.
- **Retenção**: 5 anos, eliminação automática mensal ⚖.
- **Revogação possível?**: Não (o registro existe para provar o que o titular fez, inclusive a revogação).
- **Última revisão**: 2026-10-17

---

## Checagem das "cláusulas armadilha"
- [x] Nenhuma caixa pré-marcada (cadastro, `/aceite`, saúde).
- [x] Sem "concordo com tudo": Termos/Política, idade e saúde são confirmações separadas.
- [x] Nenhum legítimo interesse para dado sensível.
- [x] O consentimento de saúde não é condição para usar o app.
- [x] **Diferença na política (rascunho)** — tratada no rascunho v1 da F4 (`.lgpd/policies/privacy-policy-v1-draft.md`, 2026-10-17): a tabela "Para que usamos e base legal" não cita os registros de consentimento (A003), a finalização automática (A008) nem os dados no aparelho (A011). Ajustar no L9/F4 (`lgpd-privacy-policy`).

## Decisões pendentes para o jurídico ⚖
1. Dados de treino (A007/A009) são dados de saúde? (N1) — define se precisam do Art. 11.
2. Prazo e forma da prova mínima de consentimento após a exclusão (A003, G6).
3. O guf se enquadra no art. 15 do Marco Civil (provedor de aplicação PJ com fins econômicos)? (A012)
4. Autodeclaração de idade é suficiente diante do ECA Digital? (A001, G11)
