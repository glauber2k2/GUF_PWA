# Regras Absolutas — vencem qualquer outra orientação

## 1. Sem IIFE em JSX/TSX

```tsx
// ❌
<div>{(() => { if (isLoading) return <Spinner />; return <Content />; })()}</div>

// ✅ componente dedicado
<div><ContentOrSpinner isLoading={isLoading} /></div>
```
A IIFE esconde uma responsabilidade no markup, não é testável nem reaproveitável.

## 2. Sem função multi-propósito

```ts
// ❌ busca, transforma e salva
async function handleUserData(id: string) { /* fetch + format + localStorage */ }

// ✅
async function fetchUser(id: string): Promise<User> { /* ... */ }
function formatUser(user: User): FormattedUser { /* ... */ }
function persistUser(user: FormattedUser): void { /* ... */ }
```
Teste rápido: se o nome precisa de "e" (`buscaEFormata`), são duas funções.

## 3. Sem comentário inline explicando "o que fez"

```ts
// ❌
// soma os itens do carrinho
const t = items.reduce((a, i) => a + i.price, 0);

// ✅
const cartTotal = sumItemPrices(items);
```
Exceção: comentário que explica **por que** (workaround de terceiro, regra de negócio, restrição de performance).

```ts
// A API retorna a data em UTC sem o sufixo Z; sem isso o parse assume o fuso local.
const createdAt = new Date(`${payload.createdAt}Z`);
```

## 4. Sem `any` sem justificativa
Use tipo específico, `unknown` + narrowing, ou generic. `any` só com comentário citando a restrição externa.

## Precedência em conflito
1. Estas regras
2. Estrutura de `/code-structure`
3. Formato de `/code-docs` (cede ao padrão oficial da linguagem)
