# Recuperar e alterar senha

Protótipo: Claude Design "Recuperar e Alterar Senha" (`SenhaScreen.dc.html`: telas 1a–1c e 2a–2c). A tela "Esqueceu a senha?" (`/recuperar-senha`) não está no protótipo e usa a mesma moldura.

## Telas e rotas

| Rota | Tela | Quem usa |
|---|---|---|
| `/recuperar-senha` | `PasswordRecoveryScreen` (features/auth/ui) | "Esqueci minha senha" do login e da tela Alterar senha. Fora do grupo `(auth)`: quem está logado também chega aqui, com o e-mail da conta já preenchido. |
| `/redefinir-senha` | `ResetPasswordForm` (features/auth/ui) | Aberta pelo link do e-mail ("Esqueci minha senha" ou "Redefinir senha" do painel). Fora do grupo `(auth)`: o link já abre a sessão. |
| `/configuracoes/senha` | `ChangePasswordScreen` (features/profile/ui) | Logado, só para quem entra com e-mail e senha (`Profile.hasPasswordLogin`; o item some das Configurações para quem entra só com o Google). |

Caminhos em `features/auth/helpers/paths.ts` (`PASSWORD_RECOVERY_PATH`, `PASSWORD_RESET_PATH`) e `features/profile/helpers/paths.ts` (`PASSWORD_SETTINGS_PATH`).

## Fluxos

- **Pedir o link:** `requestPasswordRecovery` (packages/api) com o cliente `createPasswordRecoveryClient` (`getPasswordRecoveryClient` em `shared/libs/supabase.ts`). Esse cliente é **sem PKCE** de propósito: o link traz a sessão no endereço (`#access_token…&type=recovery`) e abre em qualquer aparelho ou navegador, como o do painel. A resposta é sempre "Confira seu e-mail", exista a conta ou não (não revela quem tem conta). `redirectTo` = `<origem>/redefinir-senha`, que precisa estar nas Redirect URLs do Supabase (curinga `https://<domínio>/**`).
- **Criar a senha nova pelo link:** `useRecoverySession` abre a sessão e tira os tokens do endereço; a tela mostra a conta (`RecoveryAccountCard`: nome e e-mail, selo "Link válido") e grava com `updatePassword`, que encerra as outras sessões da conta. Link vencido ou usado: aviso + "Pedir um link novo".
- **Alterar logado:** `changePassword` confere a senha atual pelo login do Supabase (com limite de tentativas; sem isso, quem pegasse o aparelho desbloqueado tomaria a conta), grava a nova e, com "Sair dos outros aparelhos" ligado (padrão), encerra as outras sessões (`scope: "others"`). Senha atual recusada → `current_password_invalid`: o campo treme e a nova senha e a confirmação ficam preenchidas. Só com internet.

## Regras da senha nova

- Requisitos em `PASSWORD_REQUIREMENTS` (packages/core/src/password.ts): 8+ caracteres, maiúscula e minúscula, um número, um símbolo. Valem para redefinir e alterar (`strongPasswordSchema`); o cadastro continua só com o mínimo de 8.
- Andamento do formulário em `passwordFormStatus` (core): % do anel do topo, confirmação que já diverge (erro sem esperar o envio), senha igual à atual e a frase do que falta abaixo do botão. O botão só libera com tudo certo.
- Peças compartilhadas em `shared/components/password/` (moldura, anel, campo, painel de força, campos nova/confirmar, barra do botão, introdução e dica, tela de sucesso) e o estado em `shared/hooks/use-password-form.ts`.
- A tela de sucesso de Alterar senha **não** promete aviso por e-mail: o guf não envia esse aviso (o protótipo mostrava "Enviamos um aviso para o seu e-mail").

## Configuração no Supabase

- Redirect URLs com `https://<domínio do app>/**`.
- O e-mail "Reset password" usa o modelo do Supabase Auth (Authentication › Emails). Personalizar o texto em português lá.
