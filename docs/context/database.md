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
- `server/db/queries/` — SQL das queries do `sqlc` (`accounts.sql` [leitura + CRUD], `dashboard.sql`, `contas.sql` [views da tela de Contas], `transacoes.sql` [views da tela de Transações + CRUD de transação `standard`: `ListTransactionsFiltered` (filtros opcionais de período/categoria/busca ILIKE + `LIMIT`/`OFFSET` + `COUNT(*) OVER()` pro total numa query só), `ListCategories`, `ListActiveRecurringRules`, `ListInstallmentDebts` + `CreateTransaction`/`GetTransactionByID`/`UpdateTransaction`/`DeleteTransaction`; o `CreateTransaction` é `INSERT...SELECT...WHERE EXISTS` da conta do usuário, garantindo o isolamento no próprio insert], `users.sql`).
- `server/db/seed.sql` — dados de exemplo (rodado à mão, **não** é migration goose; faz `TRUNCATE` + insert ancorado no mês corrente). Inclui transações (avulsas + 1 parcela), categorias e **`recurring_rules`** (Salário/Netflix/Gympass) — alimenta `/dashboard/*` e `/transacoes/*`.

## Convenções
- Dinheiro: `NUMERIC(14,2)` (ver `money.md`). Datas/hora: `timestamptz`. Conversão p/ centavos só na borda da API.
- Nomes de tabelas/colunas em `snake_case`.
- Enums via `CHECK (col IN (...))` em coluna `text`, não `ENUM` nativo (reversível em migration, mapeia limpo no sqlc).
- PK: `uuid` com `gen_random_uuid()` (extensão `pgcrypto`). Casa com `id: string` do client.
- Toda mudança de schema = uma migration nova. **Nunca** editar uma migration já aplicada.
- Funções plpgsql / statements com `;` interno: entre `-- +goose StatementBegin` / `-- +goose StatementEnd`.
- **Leitura de dinheiro:** as queries convertem `NUMERIC`→**centavos** com cast no SQL (`(x*100)::bigint`), então o `sqlc` devolve `int64` e nunca aparece `float`/`pgtype.Numeric`. A conexão Go já está plugada (`internal/store`).

## Auth / multi-usuário (migration `00002_add_users_and_user_scope.sql`)
- **`users`** — `id` uuid, `email` (único **case-insensitive** via `CREATE UNIQUE INDEX ... (lower(email))`, sem `citext`), `password_hash` (bcrypt), `name`, `is_active`, timestamps + trigger `set_updated_at`. **Usuário padrão semeado na própria migration** (id fixo `0…01`, `teste@teste.com`/`12345`, hash via `crypt('12345', gen_salt('bf',10))` do pgcrypto — formato `$2a$` que o `x/crypto/bcrypt` do Go valida). Senha **nunca** sai do server.
- **`user_id`** (uuid, NOT NULL, FK `users(id)` ON DELETE CASCADE) em `accounts`, `categories`, `recurring_rules`, `transactions`. Migration: add nullable → backfill no usuário padrão → SET NOT NULL. Índices `(user_id)` + compostos `(user_id, occurred_on)` e parcial `(user_id, category_id, occurred_on) WHERE direction='expense'`.
- **Isolamento:** TODA query de dado filtra por `user_id` (nos **dois** lados de qualquer join — ex.: `ListCategorySpend` exige `t.user_id` E `c.user_id`). O `user_id` vem só do JWT (nunca de input). O `seed.sql` atribui os dados demo ao usuário padrão.

## Modelo de dados (v1 — migration `00001_init.sql`)
- **`accounts`** — contas. Saldo é **derivado**: `opening_balance + SUM(transactions.signed_amount)`; **não** há coluna de saldo cacheada (evita drift). `account_type` (CHECK): `checking`/`savings`/`cash`/`exchange`/`credit_card`/**`voucher`** (este último + as colunas `subtitle` e `credit_limit` vieram na migration **`00003`**, para a tela de Contas). `dot_color` é a cor de marca (= `brandColor` no client); `credit_limit` (NUMERIC, nullable) só faz sentido p/ `credit_card` — alimenta a seção **Cartões** (`/contas/cards`, por cartão) e o agregado do **Raio-X** (`ListCreditAccounts` projeta `id/icon/dot_color` além de saldo/limite; sem mudança de schema); `subtitle` é o texto "Conta Corrente • Final 4022". `is_archived=true` = soft-delete (o DELETE de conta arquiva).
- **`categories`** — customizáveis: `kind` (`expense`/`income`), `color`, `icon`, `parent_id` (subcategorias), arquiváveis.
- **`recurring_rules`** — regras de recorrência (frequência + intervalo + início, fim opcional). Geram ocorrências em `transactions`. Individual = transação sem regra; temporária = regra com `end_date` **ou** `max_occurrences` (mutuamente exclusivos); permanente = sem fim.
- **`transactions`** — tabela única com `direction` (`income`/`expense`). `signed_amount` é coluna gerada (`+amount`/`-amount`). `occurred_on` (date) é a chave de competência que o dashboard agrupa por mês. **Parcelamento** (`kind='installment'`): cada parcela é uma linha com `purchase_group_id`, `installment_number/total` e `purchase_total_amount` (CHECK garante coerência tudo-ou-nada).
- Saldo de conta, totais do mês e gasto por categoria saem por agregação sobre `transactions` (índices em `account_id`, `occurred_on` e parcial `(category_id, occurred_on) WHERE direction='expense'`). O "biggest villain" **não tem query própria**: `ListCategorySpend` já ordena por gasto desc e o `dashboard/service.go` pega o primeiro.

## Fora de escopo v1 (próximos passos)
- Investimentos + ticker de cripto (`investidoCents`, painéis de investimento) — migration própria; os endpoints já existem como stubs zerados.
- Transferências entre contas — campos `kind='transfer'` e `transfer_group_id` já reservados em `transactions`; lógica (dupla entrada) numa migration/serviço futuro.
- Orçamento por categoria (`budgets`) — o `percent` do dashboard é share derivado, não armazenado.
- ~~Multi-usuário/`user_id`~~ **feito** (migration `00002`): users + user_id + isolamento por usuário. Falta (follow-up `00003`): FKs compostas `(id, user_id)` pra tornar "transação apontando pra conta de outro usuário" impossível no banco (hoje é garantido por convenção + escopo em todo join + teste de integração).
- Cadastro self-service de usuário — por enquanto só o usuário semeado + criados via SQL (sem endpoint de registro).
