# Banco de dados (Postgres)

> Leia antes de mexer em schema, migrations ou queries.

## Infra
- Postgres 16 via `docker-compose.yml`. Credenciais em `.env` da raiz (dev: `financial`/`financial`).
- URL de conexão: `postgres://financial:financial@localhost:5432/financial_control` (lida pela env `DATABASE_URL`).
- Sobe com `npm run db:up`; logs em `npm run db:logs`.

## Stack de dados
- Driver: **`pgx/v5`** (`pgxpool`) — plugado em `internal/store`.
- Queries tipadas: **`sqlc`** (gera Go a partir do SQL em `db/queries/`; rode `sqlc generate`). Saída em `internal/store/gen/` (commitada, não editar à mão).
- Migrations: **`goose`** (SQL puro, Up + Down no mesmo arquivo). Veja `server/db/migrations/README.md`.

## Pastas
- `server/db/migrations/` — migrations versionadas (`00001_init.sql`, …). O `sqlc` lê o schema daqui.
- `server/db/queries/` — SQL das queries do `sqlc` (`accounts.sql`, `dashboard.sql`).
- `server/db/seed.sql` — dados de exemplo (rodado à mão, **não** é migration goose; faz `TRUNCATE` + insert ancorado no mês corrente).

## Convenções
- Dinheiro: `NUMERIC(14,2)` (ver `money.md`). Datas/hora: `timestamptz`. Conversão p/ centavos só na borda da API.
- Nomes de tabelas/colunas em `snake_case`.
- Enums via `CHECK (col IN (...))` em coluna `text`, não `ENUM` nativo (reversível em migration, mapeia limpo no sqlc).
- PK: `uuid` com `gen_random_uuid()` (extensão `pgcrypto`). Casa com `id: string` do client.
- Toda mudança de schema = uma migration nova. **Nunca** editar uma migration já aplicada.
- Funções plpgsql / statements com `;` interno: entre `-- +goose StatementBegin` / `-- +goose StatementEnd`.
- **Leitura de dinheiro:** as queries convertem `NUMERIC`→**centavos** com cast no SQL (`(x*100)::bigint`), então o `sqlc` devolve `int64` e nunca aparece `float`/`pgtype.Numeric`. A conexão Go já está plugada (`internal/store`).

## Modelo de dados (v1 — migration `00001_init.sql`)
- **`accounts`** — contas (banco/carteira/exchange/cartão). Saldo é **derivado**: `opening_balance + SUM(transactions.signed_amount)`; **não** há coluna de saldo cacheada (evita drift).
- **`categories`** — customizáveis: `kind` (`expense`/`income`), `color`, `icon`, `parent_id` (subcategorias), arquiváveis.
- **`recurring_rules`** — regras de recorrência (frequência + intervalo + início, fim opcional). Geram ocorrências em `transactions`. Individual = transação sem regra; temporária = regra com `end_date` **ou** `max_occurrences` (mutuamente exclusivos); permanente = sem fim.
- **`transactions`** — tabela única com `direction` (`income`/`expense`). `signed_amount` é coluna gerada (`+amount`/`-amount`). `occurred_on` (date) é a chave de competência que o dashboard agrupa por mês. **Parcelamento** (`kind='installment'`): cada parcela é uma linha com `purchase_group_id`, `installment_number/total` e `purchase_total_amount` (CHECK garante coerência tudo-ou-nada).
- Saldo de conta, totais do mês e gasto por categoria saem por agregação sobre `transactions` (índices em `account_id`, `occurred_on` e parcial `(category_id, occurred_on) WHERE direction='expense'`). O "biggest villain" **não tem query própria**: `ListCategorySpend` já ordena por gasto desc e o `dashboard/service.go` pega o primeiro.

## Fora de escopo v1 (próximos passos)
- Investimentos + ticker de cripto (`investidoCents`, painéis de investimento) — migration própria; os endpoints já existem como stubs zerados.
- Transferências entre contas — campos `kind='transfer'` e `transfer_group_id` já reservados em `transactions`; lógica (dupla entrada) numa migration/serviço futuro.
- Orçamento por categoria (`budgets`) — o `percent` do dashboard é share derivado, não armazenado.
- Multi-usuário/`user_id` — single-user por enquanto.
