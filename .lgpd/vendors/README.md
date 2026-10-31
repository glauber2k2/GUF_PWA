# Operadores e terceiros — Guf App

**Data**: 2026-10-16 · **Fase do produto**: beta em desenvolvimento, sem empresa constituída
**Owner interno**: Glauber (desenvolvedor; controlador provisório como pessoa natural — ver G22)

| Fornecedor | Papel na LGPD | Tier | País | Plano | DPA | Base Art. 33 | Veredito |
|---|---|---|---|---|---|---|---|
| [Supabase](./supabase.md) | Operador (Art. 5º, VII; Art. 39) | **Crítico** | Brasil (`sa-east-1`) desde 2026-10-16; empresa e sub-operadores nos EUA | Free | Não aceito/arquivado | Nenhuma | Aprovado com ressalvas — **bloqueado para usuários reais** até DPA + base do Art. 33 |
| [Vercel](./vercel.md) | Operador | Baixo/Médio | EUA (rede global) | Hobby | Não aceito/arquivado | Nenhuma | Aprovado com ressalvas — só para testes; trocar antes de monetizar |
| [Serviços de push](./push-services.md) (Google FCM, Apple APNs, Mozilla) | Infraestrutura do navegador/sistema escolhida pelo titular; recebe só mensagem cifrada e metadados ⚖ | Baixo | EUA | — | Não se aplica ⚖ | Avaliar com o jurídico (G8) | Aprovado com ressalvas — informado na Política 0.4-dev |
| [Stripe](./stripe.md) (planejado) | Operador; controlador independente para fraude e obrigações próprias ⚖ | **Alto** | EUA e Irlanda | — | Não aceito | DPA do Stripe (cláusulas-padrão próprias) | **Não contratado** — plano em `docs/stripe-payments-plan.md`; DPA e MFA antes da 1ª cobrança (G33) |
| [Google (login)](./google.md) | **Controlador independente** (não é operador) | — | EUA | — | Não se aplica | Não se aplica (dados enviados pelo titular por escolha dele) | Aprovado — informar na política |

**Totais**: 2 operadores (1 crítico, 1 baixo/médio) + 1 terceiro controlador · **0** com DPA e base de transferência adequados.

## Critério eliminatório pendente para os dois operadores
A skill e o Art. 39 tratam operador sem contrato como **bloqueio**, não ressalva. Enquanto o app tiver só o desenvolvedor e testadores que sabem que é um teste, o risco é baixo; **antes de abrir o beta para pessoas de fora**, é preciso:
1. Definir quem é o controlador (G22) — o contrato precisa estar no nome dele.
2. Aceitar e arquivar os DPAs do Supabase e da Vercel (G7).
3. Definir a base de transferência internacional (G8). Os DPAs desses fornecedores costumam trazer as cláusulas-padrão europeias, e a Res. CD/ANPD nº 19/2024 exige as cláusulas-padrão **brasileiras**, adotadas sem alteração ⚖. Alternativa a avaliar: mover o projeto Supabase para a região de São Paulo (`sa-east-1`) para reduzir a transferência.

## Revisões agendadas
- Supabase (crítico): trimestral → próxima em 2027-01-16
- Vercel (baixo/médio): anual → próxima em 2027-10-16, ou na troca para a hospedagem de produção
