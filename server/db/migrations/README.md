# Migrations (goose)

Schema versionado do Postgres. Ferramenta: [goose](https://github.com/pressly/goose)
com SQL puro (Up + Down no mesmo arquivo). O `sqlc` lê estes arquivos como fonte do
schema (ver `docs/context/database.md`).

## Pré-requisitos

```powershell
npm run db:up                                              # sobe o Postgres (docker compose)
go install github.com/pressly/goose/v3/cmd/goose@latest    # instala o binário (não toca go.mod)
```

Configure a conexão (mesma do `server/.env.example`):

```powershell
$env:GOOSE_DRIVER   = "postgres"
$env:GOOSE_DBSTRING = "postgres://financial:financial@localhost:5432/financial_control?sslmode=disable"
```

## Comandos

```powershell
goose -dir server/db/migrations up        # aplica as pendentes
goose -dir server/db/migrations status    # mostra aplicadas/pendentes
goose -dir server/db/migrations down      # reverte a última
```

## Convenções

- **Nunca** edite uma migration já aplicada. Mudou o schema? Crie `0000N_descricao.sql`.
- Numeração sequencial com zero à esquerda: `00001_init.sql`, `00002_...`.
- Statements com `;` interno (funções plpgsql, blocos `DO`) **precisam** ficar entre
  `-- +goose StatementBegin` / `-- +goose StatementEnd`, senão o goose corta no `;` errado.
- O `Down` dropa na ordem inversa das FKs.
