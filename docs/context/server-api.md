# API Go (server/)

> Leia antes de mexer em endpoints, handlers, DTOs ou validação.

## Estado atual
- Entrypoint: `cmd/server/main.go` — monta `config` → `store` (pool pgx) → serviços → `router.New(Deps)`.
- Config: `internal/config` lê `DATABASE_URL` (obrigatória) e `PORT` (default `8080`).
- Roteador: `internal/router/router.go` — `router.New(Deps)` injeta os serviços de domínio e registra as rotas.
- Dados: `internal/store` abre o pool (`pgxpool`) e embrulha as queries geradas pelo **sqlc** (`internal/store/gen`), devolvendo tipos próprios em **centavos** (`NUMERIC` convertido via cast no SQL — nunca float).
- Domínios: `health` (liveness), `account` (contas com saldo), `dashboard` (resumo do mês, categorias, este-mês, diagnóstico + stubs deferidos de investimentos/ticker). Helper compartilhado em `internal/httpx` (`WriteJSON`/`WriteError`).
- Banco plugado e servindo os dados reais do dashboard. Schema em `database.md`; dados de exemplo em `server/db/seed.sql`. **Sem auth** (single-user por enquanto). **Client interligado** via React Query.
- **CORS:** `httpx.CORS` embrulha o mux em `router.New` (headers de CORS + preflight `OPTIONS`→204). Origem em `CORS_ALLOW_ORIGIN` (default `*`, seguro para a API GET-only sem credenciais; trancar em prod) — **lida no `httpx.CORS`, não no `config.Load`** (que só carrega `DATABASE_URL`/`PORT`).

## Estrutura
```
server/
├── cmd/server/main.go        # wiring: config → store → serviços → router
├── sqlc.yaml                 # config do sqlc
├── db/
│   ├── migrations/           # schema versionado (goose)
│   ├── queries/              # SQL das queries (sqlc lê daqui)
│   └── seed.sql              # dados de exemplo (manual, não-goose)
├── internal/
│   ├── config/               # env: DATABASE_URL, PORT
│   ├── store/                # pool pgx + wrapper sobre o sqlc (tipos em centavos)
│   │   └── gen/              # código gerado pelo sqlc (não editar)
│   ├── httpx/                # WriteJSON / WriteError
│   ├── health/               # liveness
│   ├── account/              # GET /accounts (handler+service+DTO)
│   ├── dashboard/            # GET /dashboard/* (dto+service+handlers)
│   └── router/router.go      # router.New(Deps) → http.Handler
└── test/                     # integração/e2e (HTTP real; tag `integration` para os que usam DB)
```

## Convenções (alvo)
- Componentizado: um pacote por domínio em `internal/<domínio>/`, responsabilidade única. Sem god file; `main` só faz wiring.
- Roteamento por método+path do `ServeMux` (Go 1.22+): `mux.Handle("GET /caminho", h.Handler())`.
- Camadas por domínio: `handler` (parse req / escreve resp) → `service` (regra) → `store` (pgx/sqlc).
- Dependências injetadas por parâmetro/struct, não via global.
- DTOs: structs com tags `json`. Valide a entrada; em erro responda JSON `{"error": "..."}` com o status HTTP adequado.
- Nunca vaze detalhe interno na resposta; logue o erro real (estruturado) e devolva mensagem segura.

## Testes
- Unitário black-box ao lado do pacote (`package <pkg>_test`), testando só a API exportada.
- Integração/e2e em `server/test/` exercitando `router.New()` por HTTP.
- TDD: teste primeiro (red→green→refactor). Rode `npm run test:server` (ou `go test ./...` em `server/`).
- **Cobertura unit atual (sem DB — fakes nomeados do store):**
  - `config`: `Load()` exige `DATABASE_URL`, default `PORT=8080` e respeita override.
  - handlers (`account`/`dashboard`): JSON golden 1:1 com o contrato, lista vazia → `[]` (nunca `null`), erro do store → 500, `month` inválido/fora do intervalo (`2026-13`) → 400 com corpo `{"error":...}`.
  - `dashboard` service: net + personalidade nas **fronteiras exatas** dos limiares (50/80/100), share `percent` + pass-through fiel dos campos da categoria (`id`/`label`/`tone`/`amountCents`), `biggestVillain`, diagnóstico pelo sinal do net, stubs `[]`/zerados.
  - `httpx.CORS`: header no GET + chama o inner, preflight `OPTIONS`→204 sem chamar o inner, origem configurável.
- **Integração (tag `integration`, opt-in):** `go test -tags integration ./test/...` aplica `db/seed.sql` (DESTRUTIVO: `TRUNCATE`) e bate nos endpoints reais; pula se `DATABASE_URL` não estiver setada. O seed ancora as transações no mês corrente (`date_trunc('month', now())`), então o teste não fica flaky com o tempo.

## Endpoints
Atualize esta tabela a cada endpoint novo. As views do dashboard aceitam `?month=YYYY-MM`
(parse em `dashboard/parseMonth`; default = mês corrente pelo relógio do server; formato
inválido → **400** `{"error":"month inválido, use o formato YYYY-MM"}`). Valores monetários
sempre em **centavos** (inteiro). Sem auth.

| Método | Path | Descrição | Status |
|---|---|---|---|
| GET | `/health` | liveness check | implementado |
| GET | `/accounts` | contas com saldo all-time (centavos) | implementado |
| GET | `/dashboard/summary` | resumo do mês: net/receitas/gastos + status/quip | implementado |
| GET | `/dashboard/categories` | gasto por categoria no mês (com `percent`) | implementado |
| GET | `/dashboard/este-mes` | `spentPercent` + maior vilão | implementado |
| GET | `/dashboard/diagnosis` | cartão de diagnóstico (texto derivado do net) | implementado |
| GET | `/investments` | lista de investimentos | stub deferido (`[]`) |
| GET | `/dashboard/investments-summary` | resumo da carteira | stub deferido (zerado) |
| GET | `/dashboard/ticker` | cotação destacada (cripto) | stub deferido (zerado) |

> Os textos de personalidade (`statusLabel`/`quip`/`diagnosis`) são computados no
> `dashboard/service.go` por regrinhas de limiar marcadas como PLACEHOLDER — ajustáveis.
>
> **Limitação conhecida (decisão de produto pendente):** `pctInt` devolve 0 quando `whole <= 0`,
> então com **receita 0** o `spentPercent` é sempre 0 → o status nunca chega em "No vermelho" por
> mais que se gaste (cai em "No vácuo"). O teste em `service_test.go` fixa esse comportamento atual.

## DTOs (resposta JSON)
Tags `json` 1:1 com `client/src/types/dashboard.ts`; definidos em `account/account.go` e
`dashboard/dto.go`. Valores `*Cents`/monetários são **int64 em centavos**.

| DTO | Endpoint | Campos |
|---|---|---|
| `Account[]` | `/accounts` | `id`, `name`, `balanceCents`, `icon`, `tone`, `dotColor` |
| `MonthBalance` | `/dashboard/summary` | `netCents`, `availableLabel`, `statusLabel`, `quip`, `receitasCents`, `gastosCents`, `investidoCents` (= 0 até investimentos entrarem) |
| `CategorySpend[]` | `/dashboard/categories` | `id`, `label`, `amountCents`, `percent` (share 0..100), `tone` |
| `EsteMes` | `/dashboard/este-mes` | `spentPercent`, `biggestVillain` (categoria de maior gasto no mês) |
| `Diagnosis` | `/dashboard/diagnosis` | `title`, `body` |
| `Investment[]` | `/investments` | `id`, `name`, `valueCents`, `dailyChangePct`, `icon` — **stub `[]`** |
| `InvestmentsSummary` | `/dashboard/investments-summary` | `totalCents`, `changeCents`, `changePct` — **stub zerado** |
| `Ticker` | `/dashboard/ticker` | `name`, `symbol`, `changePct24h`, `priceCents`, `positionCents` — **stub** com `name:"Bitcoin"`/`symbol:"B"`, resto zerado |

## Decisões em aberto
- [x] Layout de pacotes: `cmd/` + `internal/<domínio>/` + `test/`.
- [x] Pacote `internal/config` para env vars.
- [ ] Middleware de logging/erro (hoje cada handler loga e responde mensagem segura).
