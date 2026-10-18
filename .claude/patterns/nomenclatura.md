# Nomenclatura

| Elemento | Regra | Exemplo |
|---|---|---|
| Variáveis | Intenção clara, sem abreviação | `userList`, não `ul` |
| Funções | Verbo + substantivo | `fetchUserById` |
| Booleanos | `is`, `has`, `can`, `should` | `isLoading`, `hasPermission` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Componentes | PascalCase | `UserProfileCard` |
| Hooks | Prefixo `use` | `useUserPermissions` |
| Classes | PascalCase + substantivo | `PaymentProcessor` |
| Arquivos e pastas | kebab-case | `user-profile-card.tsx`, `user-management/` |

## Verbos padrão

| Verbo | Quando | Exemplo |
|---|---|---|
| `get` | Já está em memória, síncrono | `getFullName(user)` |
| `fetch` | Busca remota | `fetchUserById(id)` |
| `find` | Busca em coleção, pode não achar | `findUserByEmail(list, email)` |
| `create` | Cria recurso | `createOrder(payload)` |
| `build` | Monta objeto sem persistir | `buildQueryParams(filters)` |
| `format` | Converte para exibição | `formatCurrency(value)` |
| `parse` | Texto → estrutura | `parseCurrency(text)` |
| `to` | Entre representações | `toPublicUser(user)` |
| `validate` | Retorna resultado | `validateCpf(value)` |
| `assert` | Lança erro se inválido | `assertIsAdmin(user)` |
| `handle` | Trata evento | `handleSubmit(event)` |
| `on` | Prop de callback | `onSelectUser` |

## Sufixos de arquivo
`.helper.ts` · `.service.ts` · `.repository.ts` · `.controller.ts` · `.store.ts` · `.schema.ts` · `.type.ts` · `.constants.ts`

## Proibido
- Abreviações (`usr`, `tmp2`, `dtIni`, `flg`)
- Genéricos em escopo amplo (`data`, `item`, `value`, `utils`)
- Sufixo numérico (`user2`, `formatDateV2`)
- Nome que mente sobre o custo (`getUser()` que faz HTTP)
- Dois verbos com "e" (`validateAndSave()`)

**Regra de ouro:** se o nome precisa de comentário, o nome está errado.
