# API Go (server/)

> Leia antes de mexer em endpoints, handlers, DTOs ou validação.

## Estado atual
- Entrypoint: `cmd/server/main.go` — monta `config` → `store` (pool pgx) → serviços → `router.New(Deps)`.
- Config: `internal/config` lê `DATABASE_URL` (obrigatória), `JWT_SECRET` (obrigatória, ≥32 bytes), `PORT` (default `8080`) e `JWT_TTL_DEFAULT`/`JWT_TTL_REMEMBER` (defaults `24h`/`720h`).
- Roteador: `internal/router/router.go` — `router.New(Deps)` injeta os serviços de domínio e registra as rotas.
- Dados: `internal/store` abre o pool (`pgxpool`) e embrulha as queries geradas pelo **sqlc** (`internal/store/gen`), devolvendo tipos próprios em **centavos** (`NUMERIC` convertido via cast no SQL — nunca float).
- Domínios: `health` (liveness), `auth` (login + sessão), `account` (contas com saldo + **CRUD**: create/update/archive em `account/crud.go`), `dashboard` (resumo do mês, categorias, este-mês, diagnóstico + stubs deferidos de investimentos/ticker), `contas` (views agregadas da tela de Contas: banks/cards/vouchers/cash/xray/tip, agrupando `accounts` por tipo + personalidade derivada). Helper compartilhado em `internal/httpx` (`WriteJSON`/`WriteError`/`CORS` — CORS libera `GET, POST, PATCH, DELETE, OPTIONS`).
- **Auth real, multi-usuário (`internal/auth`):** senha com **bcrypt**; sessão por **JWT HS256 alg-pinned** (claims `sub`/`iat`/`exp`; `exp` = 24h ou 30d conforme `rememberMe`). `RequireAuth` (middleware) exige `Authorization: Bearer`, valida assinatura/expiração + `is_active` (liveness) e injeta o `userID` no contexto — **fail-closed** (qualquer falha = 401, sem chamar o handler). O `userID` vem **só do token**, nunca de input do client. Só `GET /health` e `POST /auth/login` são públicos; **toda rota de dados** (inclusive os stubs) passa pelo `RequireAuth`. Login 401 genérico (e-mail/senha/inativo indistinguíveis) + bcrypt dummy (anti-enumeração). **Rate-limit anti-força-bruta** no `POST /auth/login` (`internal/ratelimit`): token-bucket em memória por IP (`ClientIP` do `RemoteAddr`), `5` tentativas/IP recarregando em `1min`; estourado → **429** com `Retry-After`, sem tocar no handler. É single-instance (estado em memória; atrás de réplicas cada uma limita sozinha) e confia no `RemoteAddr`, não no `X-Forwarded-For` — ponha um proxy confiável na frente se for encaminhar. Usuário padrão semeado na migration `00002`: `teste@teste.com` / `12345`.
- **Isolamento por usuário:** todo handler de dados lê o `userID` do contexto e o repassa ao service → store; as queries filtram por `user_id` (ver `database.md`). Teste de fogo em `server/test/auth_integration_test.go` (usuário A não vê dados de B).
- Banco plugado e servindo os dados reais do dashboard. Schema em `database.md`; dados de exemplo em `server/db/seed.sql` (pertencem ao usuário padrão). **Client interligado** via React Query (token no header `Authorization`).
- **CORS:** `httpx.CORS` embrulha o mux em `router.New` (headers de CORS + preflight `OPTIONS`→204). Métodos `GET, POST, PATCH, DELETE, OPTIONS` e headers `Accept, Authorization, Content-Type`. Origem em `CORS_ALLOW_ORIGIN` (default `*`; o token é Bearer no header, não cookie, então não há credencial de CORS — mas **trave a origem em prod**). Lida no `httpx.CORS`, não no `config.Load`.

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
│   ├── ratelimit/            # token-bucket por IP (freio do login) + middleware
│   ├── health/               # liveness
│   ├── account/              # GET /accounts + CRUD (account.go + crud.go)
│   ├── dashboard/            # GET /dashboard/* (dto+service+handlers)
│   ├── contas/               # GET /contas/* (dto+personality+service+handlers)
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
  - `httpx.CORS`: header no GET + chama o inner, preflight `OPTIONS`→204 sem chamar o inner, libera POST + Authorization, origem configurável.
  - `auth`: token round-trip + tabela de rejeição (`expirado`/`segredo errado`/`alg:none`/**`HS384`**/**`sem subject`**/lixo); login 401 genérico **byte-idêntico** entre falhas (anti-enumeração) + 400 em corpo inválido; middleware com **tabela de parsing do header** (esquema errado/token vazio/grudado → 401; `Bearer` case-insensitive + espaços aparados → segue) e injeção do `userID`; config exige `JWT_SECRET` (≥32, **com caso de limite 31/32**) + TTLs (**inválido → erro**).
  - `ratelimit`: token-bucket com relógio injetado — gasta o burst e nega, recarrega após a janela (parcial e total), chaves independentes, burst saneado p/ ≥1; middleware passa abaixo do limite e responde **429 + Retry-After** acima, sem chamar o next; `ClientIP` (ipv4/ipv6/sem porta); varredura (white-box) remove buckets ociosos.
  - `router`: tabela com TODA rota de dados → 401 sem token (pega rota nova esquecida sem `RequireAuth`); `/health` e `/auth/login` públicos; **login martelado pelo mesmo IP → 429 (e outro IP é independente)**. Os fakes de `account`/`dashboard` asseram que receberam o `userID` (prova do escopo).
- **Integração (tag `integration`, opt-in):** `go test -tags integration ./test/...` aplica `db/seed.sql` (DESTRUTIVO: `TRUNCATE`) e bate nos endpoints reais; pula se `DATABASE_URL` não estiver setada. O seed ancora as transações no mês corrente (`date_trunc('month', now())`), então o teste não fica flaky com o tempo. Os GETs vão com `Authorization: Bearer` (token via `POST /auth/login` como o usuário padrão); `auth_integration_test.go` cria um 2º usuário e prova o **isolamento A×B** (A não vê dados de B e vice-versa; sem token → 401).

## Endpoints
Atualize esta tabela a cada endpoint novo. As views do dashboard aceitam `?month=YYYY-MM`
(parse em `dashboard/parseMonth`; default = mês corrente pelo relógio do server; formato
inválido → **400** `{"error":"month inválido, use o formato YYYY-MM"}`). Valores monetários
sempre em **centavos** (inteiro). **Toda rota abaixo exige `Authorization: Bearer <token>`
(401 sem token), exceto `GET /health` e `POST /auth/login`.**

| Método | Path | Descrição | Status |
|---|---|---|---|
| GET | `/health` | liveness check (público) | implementado |
| POST | `/auth/login` | `{email,password,rememberMe}` → `{token,user}`; 401 genérico (público); **429** se exceder o rate-limit por IP | implementado |
| GET | `/auth/me` | usuário da sessão atual (exige token) | implementado |
| GET | `/accounts` | contas com saldo all-time (centavos) | implementado |
| GET | `/accounts/{id}` | conta única (escopada por id+user) → **200** `AccountDetail`; **404** se não existe — usado pra pré-preencher a edição | implementado |
| POST | `/accounts` | cria conta (body em centavos, **com** `openingBalanceCents` — exceto **`credit_card`**, que exige `openingBalanceCents = 0`: cartão não tem saldo, só fatura) → **201** + recurso; **400** se inválido | implementado |
| PATCH | `/accounts/{id}` | edita conta (**sem** saldo — `opening_balance` nunca muda na edição) → **200** + recurso; **404** se não existe | implementado |
| DELETE | `/accounts/{id}` | arquiva conta (soft-delete) → **204**; **404** se não existe | implementado |
| GET | `/dashboard/summary` | resumo do mês: net/receitas/gastos + status/quip | implementado |
| GET | `/dashboard/categories` | gasto por categoria no mês (com `percent`) | implementado |
| GET | `/dashboard/este-mes` | `spentPercent` + maior vilão | implementado |
| GET | `/dashboard/diagnosis` | cartão de diagnóstico (texto derivado do net) | implementado |
| GET | `/contas/banks` | contas de banco (checking/savings) + nota derivada | implementado |
| GET | `/contas/cards` | cartões de crédito (por item): fatura/limite/disponível/% usado + nota derivada | implementado |
| GET | `/contas/vouchers` | vales (voucher) + % restante/status derivados | implementado |
| GET | `/contas/cash` | carteira física (cash) + confiança/quip derivados | implementado |
| GET | `/contas/xray` | "Raio-X de Pobreza": dívida/limite (cartões) + Panic Meter | implementado |
| GET | `/contas/tip` | "Dica de Gestão" (texto fixo derivado) | implementado |
| GET | `/investments` | lista de investimentos | stub deferido (`[]`) |
| GET | `/dashboard/investments-summary` | resumo da carteira | stub deferido (zerado) |
| GET | `/dashboard/ticker` | cotação destacada (cripto) | stub deferido (zerado) |

> Os textos de personalidade (`statusLabel`/`quip`/`diagnosis` no dashboard; `note`/
> `noteTone`/`status`/`quip`/labels do panic/`tip` em **contas**) são computados nos
> respectivos `service.go`/`personality.go` por regrinhas de limiar marcadas PLACEHOLDER.
> O CRUD de `/accounts` mora em `account/crud.go` (escrita em **centavos** → NUMERIC no SQL;
> validação inválida → **400** com o valor ofensivo).
>
> **Limitação conhecida (decisão de produto pendente):** `pctInt` devolve 0 quando `whole <= 0`,
> então com **receita 0** o `spentPercent` é sempre 0 → o status nunca chega em "No vermelho" por
> mais que se gaste (cai em "No vácuo"). O teste em `service_test.go` fixa esse comportamento atual.

## DTOs (resposta JSON)
Tags `json` 1:1 com `client/src/types/dashboard.ts` e `client/src/types/contas.ts`;
definidos em `account/account.go`, `account/crud.go`, `dashboard/dto.go` e `contas/dto.go`.
Valores `*Cents`/monetários são **int64 em centavos**.

| DTO | Endpoint | Campos |
|---|---|---|
| `Account[]` | `/accounts` | `id`, `name`, `balanceCents`, `icon`, `tone`, `dotColor` |
| `CreateAccountInput` (req) | `POST /accounts` | `name`, `accountType`, `openingBalanceCents` (**0 obrigatório p/ `credit_card`** — `!= 0` → 400 citando "saldo inicial"), `icon`, `tone`, `dotColor`, `subtitle?`, `creditLimitCents?` |
| `UpdateAccountInput` (req) | `PATCH /accounts/{id}` | igual ao Create **menos `openingBalanceCents`** (saldo nunca editável) |
| `AccountDetail` | `GET/POST/PATCH /accounts` | `id`, `name`, `accountType`, `subtitle`, `balanceCents`, `icon`, `tone`, `dotColor`, `creditLimitCents` |
| `BankAccount[]` | `/contas/banks` | `id`, `name`, `subtitle`, `balanceCents`, `icon`, `brandColor` (= dot_color), `note`, `noteTone` |
| `CreditCard[]` | `/contas/cards` | `id`, `name`, `invoiceCents` (fatura = saldo negativo), `limitCents`, `availableCents` (= limite − fatura, ≥ 0), `usedPercent` (0..100), `icon`, `brandColor` (= dot_color), `note`, `noteTone` |
| `Voucher[]` | `/contas/vouchers` | `id`, `name`, `valueCents`, `icon`, `status` (`ativo`/`estavel`/`critico`), `remainingPercent`, `note`, `noteTone` |
| `CashWallet` | `/contas/cash` | `balanceCents`, `quip`, `confidenceLabel`, `confidencePercent` |
| `PovertyXray` | `/contas/xray` | `title`, `rows[]` (`label`/`cents`/`tone`), `panic` (`percent`/`levelLabel`/`levelTone`/`lowLabel`/`highLabel`/`note`) |
| `ManagementTip` | `/contas/tip` | `title`, `body` |
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
