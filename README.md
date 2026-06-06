# financial-control

Sistema de controle financeiro.

**Stack:**
- **client/** — App Expo (React Native) — roda em iOS, Android e Web (o "site" pro PC)
- **server/** — API em Go (biblioteca padrão, sem dependências externas por enquanto)
- **Postgres** — banco de dados, via Docker (`docker-compose.yml`)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Go](https://go.dev/dl/) 1.25+
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
│   ├── src/                # components, hooks, screens, lib, types, mocks (dashboard)
│   └── __tests__/          # testes (Jest + RNTL)
├── server/                 # API em Go (componentizada)
│   ├── cmd/server/         # entrypoint (main)
│   ├── internal/<domínio>/ # um pacote por domínio (router, health, …)
│   ├── db/migrations/      # migrations SQL versionadas (goose)
│   └── test/               # testes de integração/e2e
├── docker-compose.yml      # Postgres
├── .env                    # Credenciais do Postgres (lido pelo docker-compose)
└── package.json            # Scripts de orquestração (raiz)
```

## Como rodar

Na **raiz** do projeto:

```bash
# 1. Instala as ferramentas de orquestração (só na primeira vez)
npm install

# 2. Cria o .env do server a partir do exemplo (credenciais de dev)
cp server/.env.example server/.env   # PowerShell: Copy-Item server/.env.example server/.env

# 3. Sobe o banco Postgres em segundo plano
npm run db:up        # equivale a: docker compose up -d

# 4. Sobe client (web) + server juntos
npm run dev
```

- **Site (web):** http://localhost:8081 (Expo Web)
- **API:** http://localhost:8080 — teste com http://localhost:8080/health
- **Recarga automática:** o `npm run dev` libera as portas 8080/8081 sozinho (`kill-port`, via hooks `predev:*`) e **recarrega o server Go ao salvar** qualquer `.go` (`nodemon`); o Expo já tem hot reload nativo. O `server/.env` é carregado pelo `dotenv-cli`.
- **Config da API no client:** o client lê `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`) — embutido no bundle, então **reinicie o Expo ao mudar**; no celular físico use o IP da LAN da máquina (ex.: `http://192.168.0.10:8080`). O server aceita `CORS_ALLOW_ORIGIN` (default `*`).

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

O schema é versionado por migrations com [goose](https://github.com/pressly/goose),
em `server/db/migrations/` (veja o README de lá). A primeira migration — contas,
categorias, transações e regras de recorrência — já existe e está aplicável. A
conexão do Go com o Postgres ainda não está plugada — esse é o próximo passo
(driver `pgx` + `sqlc` para as queries tipadas).
