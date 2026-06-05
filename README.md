# financial-control

Sistema de controle financeiro.

**Stack:**
- **client/** — App Expo (React Native) — roda em iOS, Android e Web (o "site" pro PC)
- **server/** — API em Go (biblioteca padrão, sem dependências externas por enquanto)
- **Postgres** — banco de dados, via Docker (`docker-compose.yml`)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Go](https://go.dev/dl/) 1.23+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o Postgres)

Opcionais — só para rodar lint/segurança do server **localmente** (no CI são instalados automaticamente):

```bash
go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest
go install golang.org/x/vuln/cmd/govulncheck@latest
```

## Estrutura

```
.
├── client/                 # App Expo (React Native + Web)
│   └── __tests__/          # testes (Jest + RNTL)
├── server/                 # API em Go (componentizada)
│   ├── cmd/server/         # entrypoint (main)
│   ├── internal/<domínio>/ # um pacote por domínio (router, health, …)
│   └── test/               # testes de integração/e2e
├── docker-compose.yml      # Postgres
├── .env                    # Credenciais do Postgres (lido pelo docker-compose)
└── package.json            # Scripts de orquestração (raiz)
```

## Como rodar

Na **raiz** do projeto:

```bash
# 1. Instala o concurrently (só na primeira vez)
npm install

# 2. Sobe o banco Postgres em segundo plano
npm run db:up        # equivale a: docker compose up -d

# 3. Sobe client (web) + server juntos
npm run dev
```

- **Site (web):** http://localhost:8081 (Expo Web)
- **API:** http://localhost:8080 — teste com http://localhost:8080/health

### Rodar no celular

```bash
npm run dev:mobile   # abre o Expo; escaneie o QR code com o app Expo Go
```

## Scripts (raiz)

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o client (web) e o server Go ao mesmo tempo |
| `npm run dev:client` | Só o client no navegador (`expo start --web`) |
| `npm run dev:mobile` | Abre o Expo para rodar no celular (QR code) |
| `npm run dev:server` | Só a API Go (`go run ./cmd/server`) |
| `npm run db:up` | Sobe o Postgres (`docker compose up -d`) |
| `npm run db:down` | Para o Postgres |
| `npm run db:logs` | Acompanha os logs do banco |

## Testes

| Comando (na raiz) | O que faz |
|---|---|
| `npm test` | Roda os testes do client e do server |
| `npm run test:client` | Testes do frontend (Jest + Testing Library) |
| `npm run test:server` | Testes do backend (`go test ./...`) |

Trabalhamos em **TDD** (teste primeiro: red → green → refactor) e código **componentizado** — sem monolitos.

## Qualidade & CI

Todo push na `main` e todo pull request rodam o pipeline em [GitHub Actions](.github/workflows/ci.yml),
com **jobs separados e paralelos** para o server (Go) e o client (Expo):

| Etapa | server (Go) | client (Expo) |
|---|---|---|
| Lint | `golangci-lint` (v2) | `eslint` |
| Format | `gofmt` / `goimports` (via golangci-lint) | `prettier --check` |
| Typecheck | — (compilado em build) | `tsc --noEmit` |
| Testes | `go test -race ./...` | `jest` |
| Build | `go build ./...` | `expo export --platform web` |
| Vulnerabilidades | `govulncheck` | `npm audit --audit-level=high` |

Para rodar os mesmos checks **localmente** (na raiz):

| Comando | O que faz |
|---|---|
| `npm run ci` | Roda tudo: lint + format:check + typecheck + testes + segurança |
| `npm run lint` | Lint do client (ESLint) e do server (golangci-lint) |
| `npm run format` | Formata client (Prettier) e server (gofmt) in-place |
| `npm run format:check` | Confere a formatação do client sem alterar arquivos |
| `npm run typecheck` | Type-check do client (`tsc --noEmit`) |
| `npm run security` | `npm audit` (client) + `govulncheck` (server) |

> O lint e a verificação de vulnerabilidades do server exigem `golangci-lint` e
> `govulncheck` instalados (veja os [opcionais](#pré-requisitos)).

- **Frontend:** [jest-expo](https://docs.expo.dev/develop/unit-testing/) + [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/). Testes ficam em `client/__tests__/`.
  > No RNTL v14 a função `render` é **assíncrona** — sempre use `await render(...)`.
- **Backend:** pacote `testing` (embutido no Go) + `net/http/httptest`. Teste unitário black-box ao lado de cada pacote (`internal/<domínio>/<x>_test.go`, `package <domínio>_test`); integração/e2e em `server/test/`. Para asserts mais ricos, opcionalmente adicione o [testify](https://github.com/stretchr/testify):
  ```bash
  cd server && go get github.com/stretchr/testify
  ```

## Banco de dados

As credenciais ficam no arquivo `.env` da raiz (já com valores padrão de desenvolvimento):

```
postgres://financial:financial@localhost:5432/financial_control
```

O server lê essa URL pela variável `DATABASE_URL` (veja `server/.env.example`).
A conexão do Go com o Postgres ainda não está plugada — esse é o próximo passo
(driver `pgx` + `sqlc` para as queries + migrations).
