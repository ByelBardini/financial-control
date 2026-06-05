# Banco de dados (Postgres)

> Leia antes de mexer em schema, migrations ou queries.

## Infra
- Postgres 16 via `docker-compose.yml`. Credenciais em `.env` da raiz (dev: `financial`/`financial`).
- URL de conexão: `postgres://financial:financial@localhost:5432/financial_control` (lida pela env `DATABASE_URL`).
- Sobe com `npm run db:up`; logs em `npm run db:logs`.

## Stack de dados (planejada)
- Driver: `pgx`.
- Queries tipadas: `sqlc` (gera Go a partir de SQL puro).
- Schema versionado por migrations (ferramenta a definir — ex: `goose` ou `golang-migrate`).

## Convenções
- Dinheiro: `NUMERIC` (ver `money.md`). Datas/hora: `timestamptz`.
- Nomes de tabelas/colunas em `snake_case`.
- Toda mudança de schema = uma migration nova. **Nunca** editar uma migration já aplicada.
- A conexão do Go com o Postgres ainda não está plugada — é o próximo passo.

## Decisões em aberto
- [ ] Escolher a ferramenta de migration.
- [ ] Definir pastas (ex: `server/db/migrations`, `server/db/queries`).
- [ ] Modelar as primeiras tabelas (contas, transações, categorias).
