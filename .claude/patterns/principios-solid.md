# Princípios — SOLID, KISS, DRY, Clean Code, MVC/MVVM

| Princípio | Descrição |
|---|---|
| **SOLID** | Cada função ou classe tem sua responsabilidade e pode ser integrada a outra sem estar atrelada. Dependa de abstrações. |
| **KISS** | A solução mais simples que resolve. Lógica fácil de entender. |
| **DRY** | Sem repetição de regra; duplicação gera divergência. |
| **Clean Code** | Variáveis e funções enxutas e autoexplicativas. |
| **MVC / MVVM** | Separação entre dados, lógica e apresentação. |

## SOLID

| Sigla | Princípio | Na prática |
|---|---|---|
| S | Responsabilidade Única | Uma função faz uma coisa. Se faz duas, são duas funções. |
| O | Aberto/Fechado | Adicione comportamento sem alterar o núcleo. |
| L | Substituição de Liskov | Subclasse substitui a base sem quebrar o consumidor. |
| I | Segregação de Interfaces | Interfaces pequenas; ninguém implementa método que não usa. |
| D | Inversão de Dependência | Injete dependências; não instancie dentro da classe. |

## Situação → decisão

| Situação | Princípio | Decisão |
|---|---|---|
| Função cresceu e faz duas coisas | S | Separe em duas, nomeadas pelo que fazem |
| Caso novo exige `if` novo no núcleo | O | Map de estratégias ou polimorfismo |
| Filha lança erro em método herdado | L | Hierarquia errada: use composição |
| Interface que metade das implementações ignora | I | Quebre em interfaces menores |
| Service instancia o client do banco | D | Receba por injeção/parâmetro |
| Mesma regra em dois arquivos | DRY | Extraia para helper ou service |
| Abstração "para o futuro" sem uso | KISS | Remova; abstraia no segundo caso real |

## Crescimento
Construa simples, mas com fronteiras limpas para crescer sem reescrita. KISS vence extensibilidade especulativa.
