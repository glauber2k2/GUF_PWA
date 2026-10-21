# Operador: Google (API do Gemini) — GUF AI

- Razão social / registro: Google LLC (EUA) — confirmar
- País: EUA (transferência internacional, Art. 33 ⚖)
- Finalidade: gerar as respostas do GUF AI (A021)
- Dados enviados: pergunta anonimizada e os dados de treino necessários à resposta (ver `.lgpd/RIPD/ripd-guf-ai.md`). Nunca nome, e-mail, medidas, observações ou dados de outra pessoa
- Tier: operador (Art. 39) enquanto houver contrato; hoje usa a **API gratuita** (Google AI Studio)
- Owner interno: Glauber
- Última revisão: 2026-10-21 | Próxima revisão: antes do lançamento público

## Atenção (plano gratuito)
Nos termos da API gratuita, o Google pode usar o conteúdo enviado para melhorar os produtos e pede que não se envie dado pessoal sensível. Por isso o GUF AI fica **só em beta** neste plano. Antes de abrir ao público: plano pago (conteúdo fora do treinamento) ou outro provedor, DPA/cláusulas-padrão e atualização da Política ⚖.

## Configuração
- Secret `GOOGLE_GENERATIVE_AI_API_KEY` na Edge Function `guf-ai` (nunca no app nem no repositório)
- Modelo pelo secret `GUF_AI_MODEL` (padrão `gemini-flash-latest`)
- Trocar de provedor: `supabase/functions/guf-ai/model.ts`

## Avaliação
- Veredito: **APROVADO COM RESSALVAS** — só beta enquanto no plano gratuito
