# Operador: Vercel

- Razão social / registro: Vercel Inc. (EUA) — **confirmar no DPA**
- País(es) de tratamento: EUA e rede global de borda
- Finalidade: hospedar o site estático (PWA) de testes
- Dados compartilhados: IP, user-agent, URL acessada e data/hora (logs de acesso da hospedagem). **Nenhum dado do banco passa pela Vercel**: o app fala direto com o Supabase pelo navegador | Sensíveis (Art. 11)? Não
- Tier: **Baixo/Médio** (só dados de acesso, sem conteúdo do usuário)
- Plano: **Hobby**
- Owner interno: Glauber
- Última revisão: 2026-10-16 | Próxima revisão: 2027-10-16 ou na troca para a hospedagem de produção

## 1. Contrato e base legal
- [ ] 🚫 **DPA aceito/arquivado** — não feito. Verificar o DPA no site da Vercel e arquivar a cópia aqui
- [x] Papel: operador
- [x] Finalidade compatível com A012 (registros de acesso)
- [x] Base legal: A012 (`legal-basis.md`)

## 2. Segurança
- [x] HTTPS
- [ ] MFA na conta do desenvolvedor na Vercel — **verificar e ativar**
- [ ] Certificações — o fornecedor divulga; confirmar no trust center
- [ ] Retenção dos logs de acesso no plano Hobby — confirmar (G9)

## 3. Sub-operadores
- [ ] Baixar a lista de sub-operadores

## 4. Transferência internacional
- [ ] 🚫 **Base do Art. 33** — nenhuma definida (G8)
- [x] País mapeado: EUA/global

## 5. Direitos do titular e retenção
- [x] Não guarda conteúdo do usuário
- [ ] Prazo dos logs de acesso

## 6. Incidentes
- [ ] Prazo de notificação no DPA

## 7. Operacional
- [ ] Cópia do DPA nesta pasta
- [x] Owner definido

## Observação
O plano Hobby da Vercel é voltado a uso pessoal e não comercial (verificar os termos atuais). Isso já está previsto no projeto: produção em Cloudflare Pages ou plano pago da Vercel **antes de monetizar**. Quando trocar, criar `cloudflare.md` com esta mesma ficha.

## Avaliação — Vercel
- Itens atendidos: 6/15
- Eliminatórios (🚫): **REPROVADO em DPA e base do Art. 33** (pendências)
- Veredito: **APROVADO COM RESSALVAS** para testes
- Gaps abertos: G7, G8, G9
