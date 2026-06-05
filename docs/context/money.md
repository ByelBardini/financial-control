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
- Não faça aritmética monetária com `number`. Trabalhe em centavos (inteiro) ou via lib decimal.
- Formatação para exibição (R$) só na borda da UI, com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

## Decisões em aberto
- [ ] Escolher entre lib decimal vs inteiro-em-centavos no Go.
- [ ] Definir a precisão (casas decimais) por moeda.
