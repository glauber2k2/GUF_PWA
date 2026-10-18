# Anti-Patterns

| ❌ | ✅ | Princípio |
|---|---|---|
| IIFE em JSX | Função nomeada ou componente | Clean Code |
| Função que faz A, B e C | Três funções | SRP |
| Comentário explicando o que o código faz | Renomear | Clean Code |
| `utils.ts` com funções não relacionadas | Helpers por domínio | SRP |
| Hook gigante `usePageLogic()` | Um hook por responsabilidade | SRP |
| Componente com API + UI + estado | Hook (lógica) + componente (UI) | MVC/MVVM |
| Nesting de 4+ níveis | Guard clauses, early return | KISS |
| Magic numbers | Constante nomeada | Clean Code |
| Arquivo de 500+ linhas | Módulos menores | SRP |
| Controller com regra de negócio | Mover para o service | MVC |
| Service acessando o ORM direto | Passar pelo repository | DIP |
| `any` | Tipo específico, `unknown`, generic | Clean Code |
| Prop drilling (3+ níveis) | Context ou store | KISS |
| Condicional com 4+ ramos | Map de estratégias | OCP |
| Abstração "para o futuro" | Caso concreto; abstrair no segundo | KISS |
| Regra duplicada front e back | Fonte única no back; front só valida UX | DRY |
| `catch` vazio | Tratar, propagar ou logar com contexto | — |
| Classe só com estáticos | Módulo de funções | — |

## Os três mais caros
- **Controller com regra de negócio:** impede reuso por fila/CLI/job e amarra o teste ao HTTP.
- **Hook/componente multi-propósito:** cresce até ninguém mexer com segurança.
- **Regra duplicada entre camadas:** as duas versões divergem e o bug aparece em produção.
