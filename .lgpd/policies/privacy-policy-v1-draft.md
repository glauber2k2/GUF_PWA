# Política de Privacidade — guf (Guf App)

> ⏸ **RASCUNHO PARA REVISÃO JURÍDICA — NÃO PUBLICAR.**
> Gerado em 2026-10-17 a partir do código e dos artefatos `.lgpd/` (data-map v1, legal-basis v1, vendors, consent-ledger v1). Não é parecer jurídico. Marcadores entre colchetes (`[ … ]`) são dados que só o controlador pode informar. As decisões em aberto estão no fim, em "Notas para a revisão jurídica" (essa parte não é publicada).

**Versão**: 1.0 | **Vigência a partir de**: [DATA DE VIGÊNCIA] | **Última atualização**: [DATA]

## Em resumo

- Coletamos só o necessário para você registrar seus treinos e acompanhar sua evolução: conta, treinos, preferências e, se você quiser, foto e medidas corporais.
- Seus dados **não são vendidos** nem usados para publicidade. O app não tem anúncios, cookies de publicidade nem rastreadores de terceiros.
- Medidas corporais são **dados de saúde**: opcionais e só tratadas com o seu consentimento específico, que você pode revogar a qualquer momento (as medidas são apagadas na hora).
- O banco de dados fica no Brasil (São Paulo). Alguns prestadores ficam nos Estados Unidos, e a transferência segue as regras da LGPD.
- Você pode exportar seus dados, corrigir o perfil, revogar o consentimento e excluir a conta pelo próprio app, em **Perfil › Privacidade**. Outros pedidos: devglaubermonteiro@gmail.com.

---

## 1. Quem é o controlador dos seus dados

O guf é oferecido por **[RAZÃO SOCIAL]**, CNPJ **[CNPJ]**, com sede em **[ENDEREÇO]**, site **[SITE]**. Para a LGPD (Lei nº 13.709/2018), ela é a **controladora**: decide como e para que seus dados pessoais são tratados.

## 2. Encarregado pela proteção de dados (DPO)

- **Nome**: [NOME DO ENCARREGADO]
- **E-mail**: devglaubermonteiro@gmail.com

O encarregado recebe suas dúvidas, pedidos e reclamações sobre dados pessoais e é o contato com a Autoridade Nacional de Proteção de Dados (ANPD).

## 3. Quais dados tratamos, para quê e com qual base legal

| Finalidade | Dados | Base legal (LGPD) | Por quanto tempo |
|---|---|---|---|
| **Criar sua conta e permitir o acesso** | Nome (opcional), e-mail, senha (guardada de forma irreversível), plataforma de cadastro, confirmação de e-mail e declaração de idade | Execução de contrato (art. 7º, V) | Enquanto a conta existir |
| **Entrar com Google** (opcional) | Nome, e-mail, foto e identificador da conta Google, enviados pelo Google quando você escolhe essa opção | Execução de contrato (art. 7º, V) | Enquanto a conta existir |
| **Personalizar o app** | Nome exibido, unidade de peso, meta semanal, fuso horário e a opção "finalizar treino automaticamente" | Execução de contrato (art. 7º, V) | Enquanto a conta existir |
| **Foto do perfil** (opcional) | Foto da conta Google ou, no futuro, imagem enviada por você | Execução de contrato (art. 7º, V) | Enquanto a conta existir ou até você removê-la |
| **Planejar treinos** | Projetos, rotinas, dias da semana, exercícios planejados, exercícios criados por você e observações | Execução de contrato (art. 7º, V) | Enquanto a conta existir ou até você apagar |
| **Registrar treinos e mostrar sua evolução** | Data e horários do treino, pausas, exercícios, séries, cargas, repetições, tipo de série, esforço percebido e observações; cálculos como volume, 1RM estimado, recordes, calendário e sequência | Execução de contrato (art. 7º, V) | Enquanto a conta existir ou até você excluir o treino |
| **Medidas corporais** (opcional) | Peso, % de gordura, circunferências e observações | **Consentimento específico e destacado** (art. 11, I) — dado de saúde | Até você revogar o consentimento ou excluir a conta |
| **Comprovar seus aceites e consentimentos** | Documento e versão aceitos, ação (aceite ou revogação), origem, plataforma e data/hora | Cumprimento de obrigação legal (art. 7º, II, e art. 8º, § 2º) | Enquanto a conta existir; depois da exclusão, ver seção 6 |
| **Segurança da conta e prevenção a fraudes** | Endereço IP, data e hora, navegador/aparelho e eventos de login | Legítimo interesse (art. 7º, IX) e [obrigação legal — art. 15 do Marco Civil da Internet] | [PRAZO DOS REGISTROS DE ACESSO] |
| **Atender seus direitos** (exportar, excluir) | Os dados da sua conta, a seu pedido | Cumprimento de obrigação legal (art. 7º, II, e art. 18) | Nada fica guardado no servidor além do necessário para concluir o pedido |

**Não coletamos** localização, contatos, telefone, dados de outros apps nem dados de pagamento.

**Campos de texto livre** (nomes de rotinas e observações): escreva só o que for útil para o seu treino. Evite informações de saúde ou de terceiros nesses campos.

## 4. Dados de saúde (medidas corporais)

Medidas corporais são **dados pessoais sensíveis** (art. 5º, II, e art. 11 da LGPD). Elas só são tratadas se você ativar o módulo de medidas e autorizar no **Termo de Consentimento para Dados de Saúde**, registrado com data, hora e versão do termo.

- O consentimento é opcional: todo o restante do app funciona sem ele.
- Você pode revogar a qualquer momento em Perfil › Privacidade. Ao revogar, **todas as medidas são apagadas na mesma hora**.
- As medidas nunca são enviadas para ferramentas de análise, publicidade ou registros de erro.

## 5. Como tratamos seus dados

- **Coleta**: pelo que você digita no app e, se escolher, pelo login com Google.
- **Armazenamento**: em banco de dados gerenciado pelo Supabase, na região de **São Paulo (Brasil)**, com criptografia em trânsito (HTTPS).
- **Acesso**: regras de segurança no próprio banco garantem que cada conta só lê e altera os próprios dados. O acesso administrativo é restrito a quem precisa para manter o serviço.
- **No seu aparelho**: para o treino funcionar sem internet, o app guarda localmente a sua sessão de login, o treino em andamento, as alterações que ainda serão enviadas, cópias do histórico e preferências do aparelho (tema, som do fim do descanso e manter a tela ligada). Ao sair da conta, esses dados são apagados do aparelho.

### Decisão automatizada: finalizar treino automaticamente

Se você ligar a opção "Finalizar treino automaticamente" no Perfil (vem desligada), um processo no servidor encerra o treino em andamento quando **todas as séries estão concluídas e a última foi concluída há 30 minutos ou mais**. O fim do treino passa a ser o horário da última série. Você pode desligar a opção a qualquer momento e pedir revisão pelo e-mail do encarregado (art. 20 da LGPD).

## 6. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Conta, perfil, treinos, rotinas e preferências | Enquanto a conta existir |
| Medidas corporais | Até você revogar o consentimento ou excluir a conta |
| Dados no aparelho | Até você sair da conta ou limpar os dados do navegador |
| Registros de acesso e segurança | [PRAZO DOS REGISTROS DE ACESSO] |
| **Ao excluir a conta** | Os dados são apagados do banco na hora. Cópias de segurança (backups) do provedor são apagadas em até [PRAZO DOS BACKUPS] |
| **Prova dos seus aceites após a exclusão** | Guardamos por **5 anos** apenas: qual documento e versão você aceitou ou revogou, a origem, a plataforma e a data, ligados ao seu e-mail **transformado em código irreversível (hash SHA-256)** — o e-mail em si não é guardado. Nenhum outro dado (treinos, medidas, nome) é mantido. Serve para comprovar que os aceites foram obtidos conforme a lei, em caso de questionamento (art. 7º, VI, e art. 16, I). Depois do prazo, é apagado automaticamente |

## 7. Com quem compartilhamos

**Não vendemos seus dados.** Compartilhamos apenas com prestadores necessários para o app funcionar, que tratam os dados em nosso nome e conforme nossas instruções (operadores), e nos casos previstos em lei:

| Quem | Para quê | Onde | Dados |
|---|---|---|---|
| **Supabase** (Supabase, Inc.) | Banco de dados, login, envio dos e-mails de confirmação e recuperação de senha, funções do servidor | Banco no Brasil (São Paulo); empresa e alguns subcontratados nos EUA | Todos os dados da conta |
| **Vercel** (Vercel Inc.) | Hospedagem do site do app | EUA e rede global | Registros de acesso ao site (IP, data/hora, navegador). Nenhum dado de treino passa pela Vercel |
| **Google** (Google LLC) | Login com Google, só se você escolher | EUA | O Google envia ao guf nome, e-mail e foto. O guf não envia dados de treino ao Google. O Google trata os dados da sua conta Google como controlador próprio, conforme a política dele |
| **Autoridades públicas** | Cumprimento de ordem judicial ou obrigação legal | Brasil | Somente o que for exigido |

[PROVEDOR DE E-MAIL TRANSACIONAL, se for contratado um provedor próprio antes do lançamento]

## 8. Transferência internacional

O banco de dados fica no Brasil. Alguns prestadores (Vercel, Google e subcontratados do Supabase) ficam nos **Estados Unidos**. Essas transferências seguem o art. 33 da LGPD, com [MECANISMO DE TRANSFERÊNCIA — ex.: cláusulas-padrão contratuais aprovadas pela ANPD, Resolução CD/ANPD nº 19/2024].

## 9. Seus direitos (art. 18 da LGPD)

Você pode, a qualquer momento e sem custo:

1. **Confirmar** se tratamos seus dados.
2. **Acessar** seus dados.
3. **Corrigir** dados incompletos, inexatos ou desatualizados.
4. Pedir **anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.
5. **Portabilidade** dos seus dados a outro serviço.
6. **Eliminação** dos dados tratados com base no seu consentimento.
7. Saber **com quem compartilhamos** seus dados.
8. Ser informado sobre a **possibilidade de não consentir** e as consequências disso (sem consentimento, apenas o módulo de medidas fica indisponível).
9. **Revogar o consentimento**.

Você também pode se opor a um tratamento feito sem consentimento, se ele descumprir a LGPD, e pedir revisão de decisões automatizadas (seção 5).

**Pelo app** (Perfil › Privacidade):

| Direito | Como |
|---|---|
| Acesso e portabilidade | "Exportar meus dados" gera um arquivo JSON no seu aparelho |
| Correção | Edite nome, unidade e meta no Perfil; treinos e rotinas são editáveis nas próprias telas |
| Revogar consentimento de saúde | "Revogar consentimento" (as medidas são apagadas na hora) |
| Eliminação | "Excluir conta" apaga a conta e os dados (ver seção 6) |

**Outros pedidos**: escreva para devglaubermonteiro@gmail.com. Respondemos em até **15 dias** (art. 19, II). Podemos pedir uma confirmação para ter certeza de que o pedido é seu. Se não ficar satisfeito, você pode reclamar à **ANPD** (www.gov.br/anpd).

## 10. Cookies e armazenamento no aparelho

O guf **não usa cookies de publicidade, de análise nem rastreadores de terceiros**. Usa apenas armazenamento local estritamente necessário para funcionar:

| O quê | Para quê | Até quando |
|---|---|---|
| Sessão de login | Manter você conectado | Até sair da conta |
| Treino em andamento, alterações pendentes e cópias do histórico | Treinar sem internet | Até sair da conta |
| Preferências do aparelho (tema, som do fim do descanso, manter tela ligada, dicas já vistas) | Lembrar suas escolhas neste aparelho | Até você limpar os dados do navegador |
| Arquivos do app (service worker) | Abrir o app sem internet. **Não guarda dados da sua conta** | Até a próxima versão do app |

## 11. Menores de idade

O guf é destinado a pessoas com **18 anos ou mais**, o que é confirmado no cadastro. Se identificarmos uma conta de menor de idade, ela será encerrada e os dados apagados. Se você é responsável por um menor que criou uma conta, escreva para devglaubermonteiro@gmail.com.

## 12. Segurança

Adotamos medidas técnicas e administrativas para proteger seus dados, entre elas:

- Criptografia em trânsito (HTTPS) e senhas guardadas de forma irreversível.
- Login com proteção contra interceptação (PKCE) e regras de acesso no banco que isolam os dados de cada conta.
- O app usa apenas a chave pública do banco; chaves administrativas ficam só no servidor.
- Nenhum dado da conta é guardado no cache do service worker; ao sair, os dados locais são apagados.

Se ocorrer um incidente de segurança que possa causar risco ou dano relevante, comunicaremos você e a ANPD em até **3 dias úteis**, conforme o art. 48 da LGPD e a Resolução CD/ANPD nº 15/2024.

## 13. Responsabilidades

[RAZÃO SOCIAL], como controladora, responde pelo tratamento descrito nesta política. Os prestadores da seção 7 tratam os dados apenas para as finalidades contratadas e conforme nossas instruções (art. 39 da LGPD), exceto o Google, que atua como controlador próprio no login com Google.

## 14. Mudanças nesta política

Quando esta política mudar de forma relevante (finalidades, bases legais, compartilhamentos, transferências, prazos ou direitos), o app mostra **o que mudou** e pede o seu aceite antes de a nova versão valer. Mudanças apenas de redação geram uma subversão (ex.: 1.0 → 1.0.1), sem novo aceite. Versões anteriores ficam disponíveis em [ENDEREÇO DO HISTÓRICO DE VERSÕES].

## 15. Contato

- **Encarregado**: [NOME DO ENCARREGADO] — devglaubermonteiro@gmail.com
- **ANPD**: www.gov.br/anpd

---

**Histórico de versões**
- 1.0 ([DATA DE VIGÊNCIA]): publicação inicial.

---
---

## Notas para a revisão jurídica (NÃO PUBLICAR)

### Dados que só o controlador pode informar
| Marcador | Depende de |
|---|---|
| [RAZÃO SOCIAL], [CNPJ], [ENDEREÇO], [SITE] | G1, G22 — hoje não há empresa constituída; o app é desenvolvido por pessoa natural em beta |
| [NOME DO ENCARREGADO] | G2 — designação adiada para antes do lançamento (ATPP ⚖). O e-mail de contato provisório (devglaubermonteiro@gmail.com) já está preenchido |
| [PRAZO DOS REGISTROS DE ACESSO] | G9 — decisão 3 abaixo; retenção de logs dos planos Free/Hobby não confirmada |
| [PRAZO DOS BACKUPS] | G15 — depende do plano do Supabase (Free hoje; Pro recomendado antes do lançamento) |
| [MECANISMO DE TRANSFERÊNCIA] | G7, G8 — nenhum DPA aceito ainda; Res. 19/2024 exige cláusulas-padrão brasileiras |
| [PROVEDOR DE E-MAIL TRANSACIONAL] | G23 — SMTP padrão do Supabase é só para testes |
| [ENDEREÇO DO HISTÓRICO DE VERSÕES] | Decisão de produto (sugestão: `/privacidade/versoes`) |
| [DATA DE VIGÊNCIA] | Publicação |

### Decisões pendentes ⚖
1. **Dados de treino são dados de saúde?** (N1) Cargas, repetições e esforço percebido estão como dado comum (art. 7º, V). Se forem considerados dado de saúde, a base muda para o art. 11 e o fluxo de cadastro precisa de consentimento específico.
2. **Prova pós-exclusão**: prazo de 5 anos (proposto pela prescrição do CDC, art. 27) e base (art. 7º, VI e art. 16, I). Implementado em `consent_proofs` (migration `20261017132154`).
3. **Marco Civil, art. 15**: o guf é provedor de aplicação que precisa guardar registros de acesso por 6 meses? Só se aplica a pessoa jurídica com fins econômicos. O rascunho atual do app promete "6 meses" sem garantia técnica (G9). Esta versão deixa o prazo em aberto.
4. **Idade**: autodeclaração 18+ é suficiente diante do ECA Digital (Lei 15.211/2025)? (G11, etapa F13)
5. **Google como controlador independente** (não operador): confirmar.
6. **Responsabilidades (seção 13)**: redação mínima; ajustar ao modelo contratual final.

### Diferenças em relação ao rascunho exibido hoje no app (`packages/core/src/legal-content.ts`, PRIVACY 0.1-dev)
- Inclui: comprovação de aceites (A003) e prova pós-exclusão com hash do e-mail; finalização automática como decisão automatizada (art. 20); tabela de armazenamento no aparelho; responsabilidades (art. 9º, VI); operadores nomeados (Supabase, Vercel, Google) e banco no Brasil.
- Remove a promessa fixa de "6 meses" dos registros de acesso (vira marcador até a decisão 3).
- Troca "[PAÍS DOS SERVIDORES]" por "banco no Brasil; alguns prestadores nos EUA".
- Lista os 9 direitos do art. 18 completos (o rascunho do app tem 6 itens agrupados).

### Checklist do art. 9º
- [x] I — finalidade específica (seção 3)
- [x] II — forma e duração (seções 5 e 6)
- [ ] III — identificação do controlador (marcadores — G1/G22)
- [ ] IV — contato do controlador/encarregado (marcadores — G2)
- [x] V — uso compartilhado e finalidade (seção 7)
- [x] VI — responsabilidades dos agentes (seção 13, a validar)
- [x] VII — direitos do titular com menção ao art. 18 (seção 9)

### Depois da aprovação
1. Mover para `.lgpd/policies/privacy-policy-v1.md`.
2. Levar o texto para `legal-content.ts` (PRIVACY), com `changes["1.0"]` para quem aceitou a 0.1-dev.
3. `pnpm --filter @guf/core legal:hashes` → nova migration com `legal_documents` (privacy, versão 1.0, `requires_reaccept = true`).
4. Publicar app e migration juntos; quem já usa o app passa pelo `/aceite` com "O que mudou".
