# Segurança e Criptografia — Guf App

**Versão**: v1 · **Data**: 2026-10-17 · **Etapa**: F7 (`lgpd-encryption-keys`) · **Resolve (parcial)**: G16, G20
**Norma**: LGPD Art. 46 · Guia de Segurança da Informação para ATPP (ANPD)
**Escopo**: só medidas **sem custo** (decisão de 2026-10-17 em `STATUS.md`)

> Checklist técnico. **Não é parecer jurídico.**

## 1. Feito nesta etapa (código)

| Item | Onde | Situação |
|---|---|---|
| CORS da Edge Function `delete-account` restrito por lista de sites (G20) | `supabase/functions/delete-account/index.ts` | **Ativo** desde 2026-10-23: `ALLOWED_ORIGINS` = `https://gufapp.vercel.app`, `https://adminguf.vercel.app`, `http://localhost:3000`, `http://localhost:3001` (vale também para `guf-ai`, `admin-invite-staff` e `admin-reset-password`; site fora da lista recebe 403). Endereços de prévia da Vercel ficam de fora: incluir na lista se precisar testar por eles |
| Cabeçalhos de segurança da hospedagem: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` | `vercel.json` (raiz) e `apps/web/vercel.json` | Valem no próximo deploy. A Vercel lê só o arquivo da pasta configurada como Root Directory; quando souber qual é, apague o outro |
| Senha mínima de 8 caracteres no Supabase local (igual ao app) | `supabase/config.toml` | Feito (vale para o ambiente local) |

**Ativar o CORS restrito** (substitua pelo endereço real do app):

```bash
npx supabase secrets set ALLOWED_ORIGINS="https://<seu-app>.vercel.app,http://localhost:3000"
```

Depois, testar "Excluir minha conta" com uma conta de teste no app publicado.

## 2. Para você conferir nos painéis (gratuito)

### Contas de administração (maior risco hoje)
- [ ] **MFA (verificação em duas etapas)** no Supabase (Account › Security)
- [ ] MFA na Vercel
- [ ] MFA no GitHub
- [ ] MFA na conta Google (Google Cloud do login e Gmail do canal de privacidade)
- [ ] Revisar membros e tokens de acesso pessoais em cada painel; remover o que não usa

### Supabase › Authentication (projeto `yscoujsisrytytqsxkya`)
- [ ] **Senha mínima = 8** (Providers › Email), igual ao app (G16)
- [ ] **Confirmar e-mail** ligado (Providers › Email › Confirm email)
- [ ] Site URL e Redirect URLs só com o domínio do app e `http://localhost:3000/**` (sem curingas amplos)
- [ ] Google: escopos só `openid`, `email`, `profile`
- [ ] Rate limits padrão mantidos (Auth › Rate Limits)

### Supabase › API e banco
- [ ] Chaves: o app usa só a `publishable`. Se ainda existirem as chaves antigas (`anon`/`service_role` legadas) e nada mais usar, desativá-las
- [ ] Nenhuma tabela pública sem RLS: Database › Security Advisor sem alertas críticos

## 3. Criptografia

| Camada | Situação | Observação |
|---|---|---|
| **Em trânsito** | HTTPS em tudo (Vercel e Supabase); HSTS no próximo deploy | TLS gerenciado pelos fornecedores |
| **Em repouso** | Banco e backups do Supabase criptografados pelo fornecedor (AES-256, declarado na documentação de segurança) | Confirmar na página de segurança do Supabase e registrar a fonte em `vendors/supabase.md` |
| **Senhas** | Hash pelo Supabase Auth (bcrypt) | Sem senha em texto em lugar nenhum |
| **No aparelho** | IndexedDB/localStorage sem criptografia própria; apagados ao sair | Proteção depende do bloqueio do aparelho; documentado na política (seção 10) |
| **Campo a campo (dados de saúde)** | **Não aplicado** | Ver decisão abaixo |

### Decisão: sem criptografia campo a campo nas medidas (por enquanto)
- O app é um site estático sem servidor próprio. Uma chave de criptografia no navegador ficaria exposta, e uma chave dentro do banco (pgcrypto) não protege contra quem já tem acesso ao banco.
- A proteção atual das medidas é: RLS (cada conta só vê as próprias), consentimento obrigatório para gravar, revogação que apaga na hora e criptografia em repouso do fornecedor.
- **Reavaliar no RIPD do módulo de medidas (F12)**, antes de lançá-lo. Opções gratuitas futuras: cifrar no aparelho com chave derivada de uma senha do usuário (perde a recuperação se ele esquecer) ou Supabase Vault para segredos do servidor.

## 4. Melhorias gratuitas para depois (não feitas agora)

| Item | Por quê | Esforço |
|---|---|---|
| CAPTCHA no cadastro/login (Cloudflare Turnstile, gratuito, suportado pelo Supabase) | Reduz cadastro automatizado e tentativa de senha | Médio (tela + configuração) |
| MFA para usuários do app (TOTP do Supabase Auth, gratuito) | Proteção extra de conta | Médio (telas) |
| Content-Security-Policy | Reduz impacto de XSS | Médio (o Next gera scripts inline; testar em modo report-only antes) |
| Âncora externa mensal do `audit_log` | Detecta reescrita completa da cadeia | Baixo (anotar o último `self_hash`) |

**Pagos (futuro)**: proteção contra senhas vazadas (HaveIBeenPwned) do Supabase Auth e retenção longa de logs exigem plano pago (G9, G23).

## 5. Rotina

- **A cada 3 meses**: revisar a seção 2 e o Security Advisor; rodar `select * from verify_audit_log();`.
- **Ao trocar de hospedagem** (Cloudflare Pages): recriar os cabeçalhos no arquivo `_headers` e atualizar `ALLOWED_ORIGINS`.
- **Se uma chave vazar**: runbook de incidente, seção 4 (`.lgpd/incidents/runbook.md`).
