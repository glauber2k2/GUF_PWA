# Comunicação de Incidente de Segurança à ANPD — modelo do guf

**Base**: Art. 48 LGPD · Resolução CD/ANPD nº 15/2024, Art. 6º (12 itens). Envio pelo portal: https://www.gov.br/anpd
**Prazo**: 3 dias úteis do conhecimento da afetação a dados pessoais (ATPP: prazo em dobro, salvo risco à integridade física ou moral — confirmar o enquadramento ⚖).

> Preencha a partir da entrada `INC-…` do `log.md`. Revisar com advogado antes de enviar.

---

## Identificação do controlador (item 9)
- **Nome / razão social**: [RAZÃO SOCIAL ou nome da pessoa natural responsável]
- **CPF/CNPJ**: [ ]
- **Endereço**: [ ]
- **Agente de tratamento de pequeno porte (Res. 2/2022)**: [ ] Sim  [ ] Não

## Encarregado ou representante (item 8)
- **Nome**: [NOME DO ENCARREGADO — se não designado (ATPP), informar o responsável pelo canal de comunicação]
- **E-mail**: [ ]
- **Telefone**: [ ]

## Operador(es) (item 10)
| Operador | Papel | Relação com o incidente |
|---|---|---|
| Supabase, Inc. | Banco de dados, autenticação, funções (região São Paulo) | [envolvido / não envolvido] |
| Vercel Inc. | Hospedagem do site estático | [envolvido / não envolvido] |

---

## 1. Natureza e categoria dos dados afetados
[Ex.: dados de identificação (e-mail, nome), dados de autenticação (hash de senha, sessões), dados de treino (cargas, repetições), dados sensíveis de saúde (medidas corporais) — marcar o que se aplica.]

## 2. Número de titulares afetados
- **Total estimado**: [N]
- **Crianças**: [N] · **Adolescentes**: [N] · **Idosos**: [N] · **Adultos**: [N]
- Observação: o serviço é destinado a maiores de 18 anos (autodeclaração); a idade não é coletada.

## 3. Medidas de segurança
**Antes do incidente**: RLS em todas as tabelas (cada usuário acessa só os próprios dados); front com chave pública apenas; login com PKCE e senhas com hash; HTTPS; banco no Brasil; sem compartilhamento com ferramentas de análise ou publicidade; dados locais apagados ao sair. [Ajustar ao estado no dia — ver runbook, seção 6.]
**Depois do incidente**: [rotação de chaves, correção de política, encerramento de sessões, rollback…]

## 4. Riscos e possíveis impactos aos titulares
[Ex.: phishing com o e-mail, acesso à conta, exposição de dados de saúde e possível discriminação.]

## 5. Motivos da demora (se houver)
[N/A ou justificativa]

## 6. Medidas para reverter ou mitigar
- [ ] [ação]
- [ ] Comunicação aos titulares em [data]
- [ ] Monitoramento reforçado dos logs

## 7. Datas
- **Ocorrência**: [AAAA-MM-DD HH:MM -03:00]
- **Conhecimento da afetação a dados pessoais**: [AAAA-MM-DD HH:MM -03:00]
- **Esta comunicação**: [AAAA-MM-DD HH:MM -03:00]

## 11. Descrição do incidente e causa principal
[O que aconteceu, como, janela de exposição, se houve acesso efetivo.]

## 12. Total de titulares das atividades afetadas
- **Total**: [N] (`select count(*) from auth.users` no dia, ou o total da atividade afetada)

---

**Anexos (sob sigilo)**: logs, análise de causa raiz, política de privacidade vigente, mapa de dados da atividade, plano de correção.
**Enviado por**: [ ] · **Data/hora**: [ ] · **Protocolo ANPD**: [ ]
