# Serviços de push (Web Push): Google FCM, Apple APNs, Mozilla autopush

**Data**: 2026-10-19 · **Atividade**: A020 (avisos no celular: competição e seguidores)

| Campo | Avaliação |
|---|---|
| O que recebem | A mensagem do aviso **cifrada de ponta a ponta** (RFC 8291, chaves do navegador do titular) e metadados: endereço da inscrição, horário, tamanho, validade (TTL) e urgência. Não conseguem ler o texto. |
| Quem escolhe | O titular, pelo navegador ou sistema que usa (Chrome/Android → Google; Safari/iOS → Apple; Firefox → Mozilla). O guf não escolhe nem contrata. |
| Papel na LGPD | Infraestrutura do navegador/sistema do titular, como o provedor de e-mail de quem recebe. Tratado como terceiro, não operador contratado ⚖ (validar com o jurídico). |
| País | EUA (rede global) |
| Transferência internacional | Só metadados e conteúdo cifrado, só de quem ligou os avisos. Base a confirmar no G8 ⚖. |
| Minimização | Texto curto (nome e @ da pessoa; na competição, a diferença de pontos); validade de 6 h; nenhum identificador da conta no conteúdo além do nome exibido. |
| Eliminação | Inscrição recusada (404/410) é apagada pela Edge Function `push-alerts`. |
| Chave privada VAPID | Só no secret `VAPID_KEYS` da Edge Function (e na cópia do controlador fora do git); nunca no app nem no repositório. Rotação em `docs/push-notifications.md`. |
| Veredito | Aprovado com ressalvas: informado na Política 0.4-dev; revisar com o jurídico antes do lançamento público. |
