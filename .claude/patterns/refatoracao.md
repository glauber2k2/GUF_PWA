# Refatoração — Gatilhos

| Sinal | Ação |
|---|---|
| Código duplicado em 2+ lugares | Extrair helper/hook |
| Nesting de 4+ níveis | Guard clauses e early return |
| Condicional com 4+ ramos | Map de estratégias |
| Componente 100+ linhas / arquivo 200+ | Quebrar por responsabilidade |
| Variável intermediária usada uma vez, sem agregar significado | Inline |
| Wrapper que só repassa argumentos | Remover a camada |
| `else` depois de `return` | Remover o `else` |
| `try/catch` em bloco grande | Estreitar ao que pode falhar |
| Comentário explicando "o que faz" | Renomear |
| Código morto, `console.log`, TODO antigo, trecho comentado | Remover |
| Abstração com um único uso | Inline até o segundo caso |
| Hook devolvendo 5+ valores não relacionados | Separar por finalidade |
| Regra de negócio no controller | Mover para o service |

## Exemplo — guard clauses

```ts
// ❌
function getDiscount(user) {
  if (user) {
    if (user.isActive) {
      if (user.plan === "premium") return 0.2;
    }
  }
  return 0;
}

// ✅
function getDiscount(user) {
  if (!user?.isActive) return 0;
  if (user.plan !== "premium") return 0;
  return PREMIUM_DISCOUNT;
}
```

## Exemplo — map de estratégias

```ts
// ❌
if (method === "pix") return payWithPix(order);
else if (method === "card") return payWithCard(order);
else if (method === "boleto") return payWithBoleto(order);

// ✅
const PAYMENT_HANDLERS = { pix: payWithPix, card: payWithCard, boleto: payWithBoleto };
return PAYMENT_HANDLERS[method](order);
```

**Proporção:** a refatoração deve caber no escopo da tarefa. Se for maior, proponha como tarefa separada.
