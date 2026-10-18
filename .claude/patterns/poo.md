# POO — Quando e Como

**Funções puras são o padrão.** Use classe quando a lógica for complexa, stateful ou representar uma entidade
com comportamento próprio.

| Use classe | Exemplo |
|---|---|
| Lógica com múltiplos estados | Gantt, editor, motor de regras |
| Entidade com comportamento | `Order`, `Invoice`, `PaymentProcessor` |
| Extensível sem mexer no núcleo | Gateways de pagamento |
| Invariante garantida na construção | `DateRange` com início < fim |

| Use função pura | Exemplo |
|---|---|
| Transformação sem estado | `formatCurrency`, `toPublicUser` |
| Validação isolada | `validateCpf` |
| Cálculo determinístico | `calculateWorkdays` |

## Regras
- Campos privados por padrão
- Construtor valida invariantes: objeto inválido não existe
- Dependências entram pelo construtor
- Sem classe só com métodos estáticos: isso é um módulo de funções (`date.helper.ts`)
- Sem herança com mais de um nível: prefira composição
- Métodos seguem as regras de função (um propósito, verbo + substantivo)
