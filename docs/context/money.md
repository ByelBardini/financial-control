# Dinheiro / Valores monetários

> Fonte de verdade para qualquer coisa que toque dinheiro. Leia antes de cálculo, storage ou exibição.

## Regra de ouro
**Nunca** use `float`/`double`/`number` cru para dinheiro. Arredondamento binário corrompe somatórios e conciliações.

## Armazenamento (Postgres)
- Coluna monetária: `NUMERIC(14, 2)` (ajuste a precisão por moeda). Nunca `float8`/`real`/`double precision`.
- Se houver multi-moeda, guarde o código da moeda (ex: `BRL`) junto do valor.
- Timestamps: `timestamptz`.

## Go (server)
- Represente dinheiro com um tipo decimal (ex: `github.com/shopspring/decimal`) **ou** inteiro em centavos. Decida e registre a escolha aqui.
- `pgx`/`sqlc`: mapeie `NUMERIC` para o tipo decimal escolhido, nunca para `float64`.
- Validação: rejeite valores negativos onde o domínio não permite; mensagem de erro inclui o valor recebido.

## TypeScript (client)
- **Decisão:** o client trabalha em **centavos (inteiro)** ponta a ponta. Sem aritmética monetária com `number`.
- Formatação para exibição (R$) só na borda da UI, via `client/src/lib/money.ts#formatBRL(cents)`, que usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **`formatBRL` normaliza o espaço do `Intl`** (NBSP ` ` / narrow-NBSP ` ` → espaço comum): a saída do `Intl` não é byte-idêntica entre Hermes (device), web e Node (jest), então normalizar garante string estável (`"R$ 42,50"`). Ver `gotchas.md`.
- **Entrada monetária (`MoneyField`): máscara de centavos.** O `"R$"` é prefixo fixo do campo e cada dígito entra pela **direita** (`1`→`0,01`, `10`→`0,10`, `100`→`1,00`) — nunca se digita o separador. `client/src/lib/money.ts#digitsToCents(text)` lê só os dígitos → centavos (inteiro); `formatCentsInput(cents)` reformata pra exibição (`"1.234,56"`, vazio quando 0). O componente reformata o texto a cada tecla a partir do valor acumulado. Usado em saldo inicial e limite de crédito (sempre ≥ 0). **Cartão não tem saldo inicial** (só limite): o saldo do cartão é a fatura, derivada das transações — o form esconde "Saldo inicial" p/ `credit_card` e o server rejeita `openingBalanceCents != 0`.

## Decisões em aberto
- [x] **Leitura:** inteiro-em-centavos no Go. As queries do `sqlc` convertem `NUMERIC`→centavos com cast no SQL (`(x*100)::bigint`), devolvendo `int64` — sem lib decimal, sem `float`. Casa com o client (centavos ponta a ponta).
- [x] **Escrita/mutação:** **inteiro-em-centavos** também na gravação (consistente com a leitura e o client). Os endpoints de escrita de conta (`POST`/`PATCH /accounts`, em `account/crud.go`) recebem `*Cents` (`int64`); o SQL converte centavos→NUMERIC na borda (`(@x_cents::bigint)::numeric / 100`), espelhando o cast inverso da leitura. Sem lib decimal, sem `float`. Valores opcionais (ex.: `creditLimitCents`) são `*int64` (nil = NULL).
- [x] **Quantidade de ativo (investimentos):** NÃO é dinheiro — é **fracionária** (cripto). DB: `NUMERIC(28,8)`. No fio trafega como **string decimal** (`"0.00150000"`), nunca `float` nem centavos. O Go **não** faz aritmética nela: o SQL faz toda a conta (preço médio móvel, custo, valor, realizado em `NUMERIC`) e devolve **dinheiro em `int64` centavos**; a quantidade sai via `to_char` e entra direto no `::numeric` (`pgtype.Numeric.Scan(string)`). Ver `internal/store/investimentos.go#numericArg`, `db/queries/investimentos.sql` e `investimentos.md`.
- [x] **Percentuais de exibição** (`gainPct`, alocação `percent`): podem ser `float64`/`int` arredondados **só pra mostrar** — **nunca** valores monetários. O `gainCents`/`realizedCents` é sempre `int64` centavos.
- [ ] Definir a precisão (casas decimais) por moeda.
