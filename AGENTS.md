# AGENTS.md

Mapa do repositório para agentes. Leia isto no início de toda tarefa, antes de abrir qualquer fonte.

## Stack
- **server/** — Go 1.25. API HTTP com a stdlib (`net/http`, roteamento por método+path do `ServeMux`). Schema via migrations (**goose**); acesso a dados com **`pgx` + `sqlc`** (plugado) servindo os endpoints REST do dashboard. CORS habilitado.
- **client/** — Expo 56 (React Native 0.85, React 19, TypeScript 6). Roda iOS, Android e Web (o "site" pro PC). Tela **Dashboard** em `client/src/`, **interligada à API real** via React Query (chamadas isoladas em `src/api`).
- **Postgres 16** — via `docker-compose.yml` na raiz.
- **Orquestração** — `package.json` na raiz usa `concurrently` para subir client + server juntos.

## Layout
```
.
├── client/                 # App Expo (RN + Web)
│   ├── __tests__/          # testes (Jest + RNTL)
│   └── src/                # components, hooks, screens, lib, theme, types, mocks
├── server/                 # API Go — componentizada
│   ├── cmd/server/         # entrypoint fino (main, só wiring)
│   ├── internal/           # um pacote por domínio (router, health, account, dashboard, store, config, httpx)
│   │   └── <domínio>/      # ex: health/ → health.go + health_test.go (black-box)
│   ├── db/                 # migrations (goose) + queries (sqlc) + seed.sql
│   └── test/               # testes de integração/e2e (HTTP real; tag `integration`)
├── docs/context/           # docs por domínio (fonte de verdade — leia antes do código)
├── docker-compose.yml      # Postgres
├── .env                    # credenciais do Postgres (dev)
└── package.json            # scripts de orquestração (raiz)
```

Princípio: **componentizado, sem monolitos**. Um pacote/arquivo por responsabilidade; nada de `main.go` ou tela de 1k linhas.

## docs/context/ — tabela de domínios
Leia o doc da área **antes** de abrir a fonte correspondente. Atualize-o após qualquer mudança no contrato.

| Área | Doc | Quando ler |
|---|---|---|
| Dinheiro / valores | `docs/context/money.md` | qualquer cálculo, storage ou exibição de valor monetário |
| Transações (domínio) | `docs/context/transacoes.md` | conceito de transação: tipos/`kind`, sentido, recorrência, parcelamento, tags |
| Investimentos (domínio) | `docs/context/investimentos.md` | carteira: ativos + operações, posição derivada (preço médio móvel), realizado, cripto à parte, histórico de preço |
| Cotação (preços externos) | `docs/context/cotacao.md` | buscar preço de mercado (brapi/CoinGecko), interface `FonteDePreco`, batch, BRT, close não-ajustado |
| API Go | `docs/context/server-api.md` | endpoints, handlers, DTOs, validação no server |
| Banco de dados | `docs/context/database.md` | schema, migrations, queries, pgx/sqlc |
| App Expo | `docs/context/client-app.md` | telas, componentes, hooks, chamadas à API no client |
| Armadilhas | `docs/context/gotchas.md` | sempre que um bug recorrente/contraintuitivo aparecer |

## Onde os testes rodam
- **Raiz:** `npm test` roda os dois pacotes (`test:server` + `test:client`). TDD: teste primeiro.
- **server:** `npm run test:server` (= `go test ./...`). Unit black-box (`package <pkg>_test`) ao lado de cada pacote; integração/e2e em `server/test/`.
- **client:** `npm run test:client`. Jest + `jest-expo` + `@testing-library/react-native`, testes em `client/__tests__/`.

## Comandos (na raiz)
| Comando | O que faz |
|---|---|
| `npm run dev` | client (web) + server Go juntos (libera as portas 8080/8081 e dá hot-reload no server) |
| `npm run dev:server` | só a API Go (nodemon hot-reload em `.go`; carrega `server/.env`) |
| `npm run dev:client` | só o client no navegador (`expo start --web`) |
| `npm run dev:mobile` | abre o Expo no celular (QR code) |
| `npm test` | testes dos dois pacotes |
| `npm run test:server` / `test:client` | testes de um pacote só |
| `npm run db:up` / `db:down` / `db:logs` | Postgres via Docker |

## Endereços (dev)
- Web (Expo): http://localhost:8081
- API (Go): http://localhost:8080 — teste em `/health`
- Postgres: `postgres://financial:financial@localhost:5432/financial_control`
