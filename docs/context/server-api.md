# API Go (server/)

> Leia antes de mexer em endpoints, handlers, DTOs ou validação.

## Estado atual
- Entrypoint: `cmd/server/main.go` (fino — só lê `PORT`, default `8080`, e sobe `router.New()`).
- Roteador: `internal/router/router.go` (`router.New()` registra as rotas de cada domínio).
- Domínios: `internal/health/` (handler de liveness). Próximos: `account`, `money`, `store`.
- Único endpoint: `GET /health` → `{"status":"ok"}`.
- Sem banco plugado ainda (próximo passo: `pgx` + `sqlc`, ver `database.md`).

## Estrutura
```
server/
├── cmd/server/main.go        # entrypoint fino (wiring)
├── internal/
│   ├── router/router.go      # router.New() → http.Handler
│   └── health/               # um pacote por domínio
│       ├── health.go
│       └── health_test.go    # package health_test (black-box)
└── test/                     # integração/e2e (HTTP real)
    └── integration_test.go
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

## Endpoints
Atualize esta tabela a cada endpoint novo.

| Método | Path | Descrição | Status |
|---|---|---|---|
| GET | `/health` | liveness check | implementado |

## Decisões em aberto
- [x] Layout de pacotes: `cmd/` + `internal/<domínio>/` + `test/`.
- [ ] Middleware de logging/erro.
- [ ] Pacote `internal/config` para env vars (hoje `getenv` vive no `main`).
