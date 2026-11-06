# Play Store: PWA empacotado (TWA) agora, app nativo (React Native) depois

> Decisão de 2026-11-06: o guf vai para a Google Play como **TWA** (Trusted Web Activity) do PWA
> `https://treino.gufapp.com.br`. Quando o app nativo em **React Native (Expo)** ficar pronto, ele
> **substitui o TWA no mesmo anúncio** da Play Store, como uma atualização comum. Este documento
> diz o que fixar desde o primeiro envio para essa troca funcionar, e como fazer cada etapa.

## 1. O que nunca pode mudar (decidir antes do 1º envio)

| Item | Valor | Por quê |
|---|---|---|
| **Nome do pacote** (`applicationId`) | Sugestão: `br.com.gufapp.treino` (domínio ao contrário). Confirmar antes de gerar o primeiro AAB | É a identidade do anúncio. O app nativo só substitui o TWA se usar **exatamente** o mesmo nome de pacote. Não dá para trocar depois de publicado |
| **Chave de assinatura do app** | Gerada e guardada pela Google (**Play App Signing**, padrão em app novo) | A Play só aceita a atualização se ela for assinada com a mesma chave. Com o Play App Signing, a Google guarda essa chave; perder a *chave de envio* tem conserto, perder a de assinatura não |
| **Chave de envio** (upload key) | Arquivo `.keystore` gerado no 1º empacotamento + senha | Guardar o arquivo e a senha no gerenciador de senhas (nunca no git). Serve para assinar o TWA e, depois, o app nativo |
| **`versionCode`** | Número inteiro que só cresce (1, 2, 3…) | O app nativo precisa sair com `versionCode` **maior** que o último TWA publicado |
| **Domínio do app** | `https://treino.gufapp.com.br` | O TWA abre esse endereço e o Android confere o vínculo (seção 3). O app nativo usa o mesmo domínio para os links abrirem nele |

## 2. Gerar o TWA

Ferramenta recomendada: **Bubblewrap** (CLI oficial do Google Chrome Labs), ou o **PWABuilder**
(site da Microsoft que usa o Bubblewrap por baixo). Os dois geram um projeto Android com o TWA.
Não entram no repositório como dependência: rodam à parte, numa pasta fora do monorepo.

Pré-requisitos: o site no ar com HTTPS, `manifest.webmanifest` (já existe em `apps/web/src/app/manifest.ts`),
ícones 512 px e maskable (já em `apps/web/public/icons/`) e service worker (já existe, `/sw.js`).

Passos com o Bubblewrap:

1. Instalar: Node 20+ e JDK 17. `npx @bubblewrap/cli init --manifest https://treino.gufapp.com.br/manifest.webmanifest`
   (o próprio Bubblewrap oferece baixar o JDK e o Android SDK).
2. Responder as perguntas: **Application ID** = o nome do pacote da seção 1; nome "guf"; cor de fundo e do tema = as do manifesto;
   **Signing key**: criar uma nova (essa é a *chave de envio*; guardar o `.keystore` e a senha).
3. `npx @bubblewrap/cli build` → gera `app-release-bundle.aab` (o que vai para a Play) e um `.apk` para testar no celular.
4. A cada nova versão do TWA: subir o `appVersionCode` no `twa-manifest.json` e gerar de novo. O conteúdo do app
   (telas, regras) **não** precisa de nova versão na Play: vem do site, publicado pela Cloudflare.

## 3. Vínculo do domínio (Digital Asset Links)

Sem isso o TWA abre com a barra de endereço do Chrome no topo (parece um site, não um app).

1. Na Play Console › o app › **Configuração › Integridade do app › Assinatura de apps**, copiar o
   **SHA-256 da chave de assinatura do app** (a da Google) e o da **chave de envio**.
2. Criar `apps/web/public/.well-known/assetlinks.json` (vai para `out/.well-known/` no build):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "br.com.gufapp.treino",
      "sha256_cert_fingerprints": ["<SHA-256 DA CHAVE DE ASSINATURA DA PLAY>", "<SHA-256 DA CHAVE DE ENVIO>"]
    }
  }
]
```

3. Publicar o site e conferir: `https://treino.gufapp.com.br/.well-known/assetlinks.json` deve abrir com 200 e
   `Content-Type: application/json`. Se der 404 na Cloudflare, conferir se a pasta `.well-known` foi enviada
   (pastas que começam com ponto podem ser ignoradas pelo envio de arquivos estáticos).
4. Testar com a ferramenta do Google: `https://developers.google.com/digital-asset-links/tools/generator`.

Não criar o arquivo com valores inventados: sem as impressões digitais reais, o vínculo falha.

## 4. Ficha da Play Console (exigências que o guf precisa atender)

- **Política de privacidade:** `https://treino.gufapp.com.br/privacidade`.
- **Exclusão de conta:** a Play exige um **link na web** onde a pessoa pede a exclusão sem instalar o app.
  O app exclui em Configurações › Privacidade › Excluir conta; para a web, usar uma página pública que explique
  o caminho e o e-mail `PRIVACY_CONTACT_EMAIL` (ex.: `/documentos` ou uma página nova) — criar antes do envio.
- **Segurança dos dados** (Data safety): preencher com o mapa de dados de `.lgpd/data-map.md`
  (conta, treinos, medidas corporais só com consentimento, foto, GUF AI com o Google Gemini, pagamentos pelo Stripe).
- **Classificação de conteúdo** e **público-alvo**: 18+, como nos Termos (`.lgpd/eca-digital.md`).
- **Teste fechado:** conta pessoal nova na Play precisa de um teste fechado com testadores por um período antes de
  publicar em produção. Conferir a regra vigente na Play Console ao criar a conta.

## 5. Pagamento do Pro dentro do app da Play (ATENÇÃO)

A Google Play tem regras próprias para vender **conteúdo digital e assinaturas** dentro de apps distribuídos por ela
(em geral, exige o faturamento da própria Google Play, com exceções por país e programas de faturamento alternativo).
O Pro hoje é vendido pelo **Stripe**, na web. **Antes de publicar o TWA com a venda aberta**, confirmar na
[Central de políticas da Play](https://support.google.com/googleplay/android-developer/answer/9858738) a regra vigente
para o Brasil e escolher um caminho:

1. **Não vender dentro do app da Play** (o TWA esconde a compra; quem assina faz pela web); ou
2. Aderir a um programa de faturamento alternativo/escolha do usuário, se disponível para o Brasil; ou
3. Usar o **Google Play Billing** no app (no TWA, pela Digital Goods API; no nativo, pela biblioteca de faturamento).

Isso tem risco de remoção do app da loja e precisa de validação (inclusive jurídica) antes da venda; não está
implementado. O app ainda não diferencia "aberto pela Play" de "aberto no navegador".

## 6. Trocar o TWA pelo app nativo (React Native / Expo) no mesmo anúncio

1. **Mesmo pacote:** em `app.json`/`app.config.ts` do Expo, `android.package` = o nome do pacote da seção 1.
2. **Mesma assinatura:** gerar o AAB do nativo assinado com a **mesma chave de envio** (no EAS: `eas credentials`
   › Android › usar o keystore existente). A Play reassina com a chave de assinatura que ela guarda.
3. **`versionCode` maior** que o do último TWA (no Expo: `android.versionCode`).
4. **Publicar como atualização** do mesmo app na Play Console (mesma faixa de produção). Quem tem o TWA recebe o nativo
   como atualização comum; o anúncio, as avaliações e os downloads continuam.
5. **Links:** manter o `assetlinks.json` e declarar *App Links* (`intentFilters` com `autoVerify` para
   `https://treino.gufapp.com.br`) no nativo, para os links do guf (convites `/pessoa?u=…`, comunicados) abrirem no app.
6. **O que NÃO passa do TWA para o nativo** (o TWA guarda tudo no Chrome; o nativo não enxerga o Chrome):
   - **Sessão:** a pessoa entra de novo na conta (os dados estão no Supabase e continuam).
   - **Fila offline e treino em andamento no aparelho** (IndexedDB): pedir para terminar o treino antes de atualizar;
     o nativo pode mostrar um aviso na primeira abertura. Gravações ainda não enviadas se perdem.
   - **Notificações:** a inscrição Web Push do Chrome não serve para o nativo; o nativo se inscreve de novo
     (FCM/Expo Notifications) e precisa de uma nova forma de envio na Edge Function `push-alerts` (revisar o RIPD social).
   - **Preferências do aparelho** (tema, som do descanso, tela ligada): voltam ao padrão.
7. **Reaproveitar o código:** `packages/core`, `schemas`, `api` e `types` já são independentes de React DOM e
   foram feitos para isso (`docs/architecture.md`). As telas são refeitas em React Native.
8. **Antes de enviar:** testar a atualização instalando o TWA de produção num celular e, por cima, o AAB do nativo
   pelo teste interno da Play (não por APK solto, que tem outra assinatura).

## 7. Checklist do primeiro envio

- [ ] Nome do pacote decidido e anotado aqui.
- [ ] Chave de envio (`.keystore` + senha) no gerenciador de senhas.
- [ ] Play App Signing ativo.
- [ ] `assetlinks.json` publicado com as duas impressões digitais e conferido.
- [ ] Página pública de exclusão de conta.
- [ ] Segurança dos dados preenchida a partir do `.lgpd/data-map.md`.
- [ ] Decisão sobre a venda do Pro dentro do app da Play (seção 5).
- [ ] Domínio no Supabase Auth (Redirect URLs) e no `ALLOWED_ORIGINS` (já necessários para o site).
