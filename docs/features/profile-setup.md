# Cadastro em passos (/bem-vindo)

> Detalhes de implementação que saíram do `CLAUDE.md` (índice em "Funcionalidades: onde ler os detalhes").
> Ler inteiro antes de mexer nesta funcionalidade e atualizar no mesmo PR quando o código mudar.

## Cadastro em passos (/bem-vindo)
- **Protótipo:** Claude Design `Cadastro Passo a Passo.dc.html` + `Onboarding.dc.html`. Conta nova, logo depois de criar a conta (e do `/aceite`): nome e @ (sugestões pelo nome, `suggestHandles` em core/social.ts; @ em uso mostra opções livres), foto (galeria ou câmera, o mesmo recorte do Editar perfil) e amigos (busca por nome ou @ e convite pelo link do perfil; sem "pessoas que você talvez conheça": o app não tem amigos em comum nem contatos), todos com "Pular", e o resumo "Tudo pronto" (o que ficou para depois). Tela imersiva.
- **Peças:** `ProfileSetupScreen` (features/social/ui) com `useProfileSetupSteps` (avançar, voltar, pular) e `useSetupIdentity` (nome, @ com `useHandleAvailability`, gravação: @ primeiro); passos em `features/social/components/profile-setup/`. `FollowCell` saiu da busca de pessoas para `components/follow-cell.tsx` (busca e cadastro).
- **Quando aparece:** `profiles.profile_setup_completed_at` (migration `20261028120000_profile_setup`; contas que já existiam vêm marcadas). `ProfileSetupRedirect` (features/onboarding, montado no `OnboardingTour` de app/(app)) leva a `/bem-vindo` enquanto for null; sem resposta (offline, erro) não leva. Concluir ou pular grava pela `OnboardingApi` (`getProfileSetupStatus`, `completeProfileSetup`; hooks `useProfileSetupStatus`, `useCompleteProfileSetup`) e vai para a Início; o tutorial espera o cadastro terminar. Dev: `?estado=cadastro`.
