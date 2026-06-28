# API Go (server/)

> Leia antes de mexer em endpoints, handlers, DTOs ou validação.

## Estado atual
- Entrypoint: `cmd/server/main.go` — monta `config` → `store` (pool pgx) → serviços → `router.New(Deps)`.
- Config: `internal/config` lê `DATABASE_URL` (obrigatória), `JWT_SECRET` (obrigatória, ≥32 bytes), `PORT` (default `8080`) e `JWT_TTL_DEFAULT`/`JWT_TTL_REMEMBER` (defaults `24h`/`720h`).
- Roteador: `internal/router/router.go` — `router.New(Deps)` injeta os serviços de domínio e registra as rotas.
- Dados: `internal/store` abre o pool (`pgxpool`) e embrulha as queries geradas pelo **sqlc** (`internal/store/gen`), devolvendo tipos próprios em **centavos** (`NUMERIC` convertido via cast no SQL — nunca float).
- Domínios: `health` (liveness), `auth` (login + sessão), `account` (contas com saldo + **CRUD**: create/update/archive em `account/crud.go`), `dashboard` (resumo do mês, categorias, este-mês, diagnóstico + stubs deferidos de investimentos/ticker), `contas` (views agregadas da tela de Contas: banks/cards/vouchers/cash/xray/tip, agrupando `accounts` por tipo + personalidade derivada), `transacoes` (views da tela de Transações: summary/list/recurrences/debts sobre `transactions`/`recurring_rules` + **CRUD** de transação `standard` em `/transactions`; labels/tag/colapso derivados em `personality.go`), `investimentos` (carteira: views da tela — summary/positions/allocation/crypto — sobre `investment_assets`/`investment_trades`/`investment_prices` com **posição derivada** (preço médio móvel) via CTE recursiva + **CRUD** de ativo/operação em `/investimentos/assets`; cripto à parte; ver `investimentos.md`). Helper compartilhado em `internal/httpx` (`WriteJSON`/`WriteError`/`CORS` — CORS libera `GET, POST, PATCH, DELETE, OPTIONS`).
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
│   ├── transacoes/           # /transacoes/* views + /transactions CRUD
│   ├── investimentos/        # /investimentos/* views + CRUD de ativo/operação (CTE recursiva)
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
| GET | `/transacoes/summary` | fluxo de caixa do mês (inflow/outflow/net + barra + "Previsão de Colapso"); aceita `?month=YYYY-MM` | implementado |
| GET | `/transacoes/list` | log **filtrado + paginado**: `?period=30d`(default)`\|3m\|6m\|1y\|custom` (custom usa `?from=&to=` YYYY-MM-DD), `?category=<id>` **repetível** (OR entre as), `?q=<busca ILIKE>`, `?page=N` (1-based), `?pageSize=N` (default **10**, clamp `[1,100]`; ≤0/ausente → default — o desktop manda o nº de linhas que cabem na tela; filtros lenientes) → **envelope** `TransactionPage` | implementado |
| GET | `/categories` | categorias ativas do usuário (alimenta o filtro de categoria) | implementado |
| GET | `/transacoes/recurrences` | recorrências ativas (`recurring_rules`) — receitas + assinaturas; cada uma traz **`isDue`** (a ocorrência do período corrente ainda não foi registrada → o client mostra "Registrar") | implementado |
| GET | `/transacoes/debts` | compras parceladas agregadas por `purchase_group_id` (progresso + ironia) | implementado |
| POST | `/transactions` | cria transação `standard` (body em centavos; `direction` inflow/outflow → income/expense) → **201** + recurso; **400** inválido **ou** conta/categoria não-própria | implementado |
| GET | `/transactions/{id}` | transação única (escopada por id+user) → **200** `TransactionDetail`; **404** | implementado |
| PATCH | `/transactions/{id}` | edita (sem trocar de conta) → **200** + recurso; **404** | implementado |
| DELETE | `/transactions/{id}` | exclui (**hard delete** — transação não tem soft-delete) → **204**; **404** | implementado |
| POST | `/transactions/installment-purchases` | **compra parcelada**: cria N linhas `kind='installment'` (mesmo `purchase_group_id`, datadas mês a mês), valor **por parcela** → **201** `{created:N}`; **400** inválido ou conta não-própria | implementado |
| POST | `/recurring-rules` | **transação fixa (modelo)**: registra só a regra em `recurring_rules` — **não lança transação** (cada ocorrência é registrada pelo botão) → **201** `{created:true}`; **400** inválido ou conta não-própria | implementado |
| POST | `/recurring-rules/{id}/register` | **registra a ocorrência do período corrente**: lança a transação `standard` (copia conta/categoria/valor/sentido da regra, `recurring_rule_id` setado, `occurred_on=hoje`) → **201** + `TransactionDetail`; **409** já registrada neste período / fora da janela; **404** regra não-própria | implementado |
| GET | `/investimentos/summary` | resumo do portfólio GERAL (cripto fora): patrimônio/ganho/% + título/quip | implementado |
| GET | `/investimentos/positions` | posições abertas do portfólio geral (preço médio derivado) | implementado |
| GET | `/investimentos/allocation` | alocação por classe (Ações/FIIs/Renda Fixa; percent = share) | implementado |
| GET | `/investimentos/crypto` | bloco de cripto À PARTE (subtotal próprio + `series` do histórico) | implementado |
| GET | `/investimentos/evolution` | evolução do patrimônio geral (cripto fora): valor de mercado × custo acumulado por dia (forward-fill; sem preço no ledger → cai no `current_price` manual, batendo com as posições); `?range=` 1mo/3mo/6mo/1y/max (default 6mo) | implementado |
| POST | `/investimentos/backfill` | dispara (em background) o backfill de ~1 ano de histórico dos ativos JÁ cadastrados do usuário (classes cotáveis; renda_fixa fora) → **202** `{assets:N}` (quantos entraram na fila). Best-effort; rode 1× após configurar `BRAPI_TOKEN` | implementado |
| GET | `/investimentos/assets` | todos os ativos + posição derivada (gestão) | implementado |
| POST | `/investimentos/assets` | cria ativo → **201** + `AssetDetail`; **400** inválido (backfill de preço dispara em background) | implementado |
| GET | `/investimentos/assets/{id}` | ativo completo (posição + operações) → **200**; **404** | implementado |
| GET | `/investimentos/assets/{id}/history` | série diária de preço do ativo; `?range=` 1mo/3mo/6mo/1y/max (default 6mo) → **200** `PriceHistoryPoint[]` | implementado |
| PATCH | `/investimentos/assets/{id}` | edita metadados + preço (classe imutável; preço novo grava histórico) → **200**; **404** | implementado |
| DELETE | `/investimentos/assets/{id}` | arquiva ativo → **204**; **404** | implementado |
| POST | `/investimentos/assets/{id}/trades` | compra/venda (`side` buy/sell, `quantity` string, centavos, **`accountId`** de liquidação) → **201** + ativo; liquida na conta (`kind='investment'`: compra debita / venda credita) atômico; **400** venda > posição / conta inválida; **404** ativo | implementado |
| DELETE | `/investimentos/assets/{id}/trades/{tradeId}` | exclui operação (posição recomputa; **cascata** a transação de caixa) → **204**; **404** | implementado |
| GET | `/investments` | bloco "Investimentos" da Início — posições abertas da carteira real (deriva de `ListPositions`, carteira inteira) | implementado |
| GET | `/dashboard/investments-summary` | resumo da carteira (valor atual + ganho/perda + %) da Início, da carteira real | implementado |

> Os textos de personalidade (`statusLabel`/`quip`/`diagnosis` no dashboard; `note`/
> `noteTone`/`status`/`quip`/labels do panic/`tip` em **contas**; `collapse` (Previsão de Colapso)
> + notas de dívida e os `dateLabel`/`timeLabel` em **transacoes**) são computados nos respectivos
> `service.go`/`personality.go` por regrinhas de limiar/formatação marcadas PLACEHOLDER. A `tag`/
> `tagTone` de cada transação **deixou de ser placeholder**: é derivada de sinais reais por
> precedência em `transactionTag(direction, kind, essentialness, isRecurring)` — `Investimento`
> (kind=investment, tom `neutral`) > `Parcelado` (kind=installment) > `Fixo`/`Inflow Esperado`
> (recurring) > `Sobrevivência`/`Supérfluo` (essentialness da categoria) / `Renda Extra` (receita
> avulsa). O CRUD de `/accounts` e
> `/transactions` mora em `*/crud.go` (escrita em
> **centavos** → NUMERIC no SQL; validação inválida → **400** com o valor ofensivo). Em
> `transacoes`, `direction` do client (inflow/outflow) é mapeado pro banco (income/expense), e a
> criação só grava se a conta/categoria do corpo é do usuário (isolamento no próprio INSERT).
>
> **Limitação conhecida (decisão de produto pendente):** `pctInt` devolve 0 quando `whole <= 0`,
> então com **receita 0** o `spentPercent` é sempre 0 → o status nunca chega em "No vermelho" por
> mais que se gaste (cai em "No vácuo"). O teste em `service_test.go` fixa esse comportamento atual.

## DTOs (resposta JSON)
Tags `json` 1:1 com `client/src/types/dashboard.ts`, `contas.ts` e `transacoes.ts`;
definidos em `account/account.go`, `account/crud.go`, `dashboard/dto.go`, `contas/dto.go`,
`transacoes/dto.go` e `transacoes/crud.go`.
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
| `MonthBalance` | `/dashboard/summary` | `netCents`, `availableLabel`, `statusLabel`, `quip`, `receitasCents`, `gastosCents`, `investidoCents` (valor atual da carteira — Σ posições abertas) |
| `CategorySpend[]` | `/dashboard/categories` | `id`, `label`, `amountCents`, `percent` (share 0..100), `tone` |
| `EsteMes` | `/dashboard/este-mes` | `spentPercent`, `biggestVillain` (categoria de maior gasto no mês) |
| `Diagnosis` | `/dashboard/diagnosis` | `title`, `body` |
| `CashflowSummary` | `/transacoes/summary` | `inflowCents`, `outflowCents`, `netBurnCents`, `burnPercent` (0..100), `collapse` (`PanicMeter`: `percent`/`levelLabel`/`levelTone`/`lowLabel`/`highLabel`/`note`) |
| `TransactionPage` | `/transacoes/list` | `items` (`Transaction[]`: `id`, `dateLabel` "12 OUT", `timeLabel` "12/10", `title`, `accountLabel`, `category`, `tag`, `tagTone`, `amountCents`, `direction`, `icon`), `page`, `pageSize` (10), `total`, `pageCount` |
| `Category[]` | `/categories` | `id`, `name`, `icon`, `kind` (income/expense) |
| `Recurrence[]` | `/transacoes/recurrences` | `id`, `name`, `category`, `amountCents`, `direction`, `icon`, `isDue` (período corrente pendente de registro; calendário: dia / semana-domingo / mês / ano — `interval_count` ignorado na V1; decidido em Go com relógio injetável) |
| `FutureDebt[]` | `/transacoes/debts` | `id`, `label`, `installmentLabel` ("Parcela X/Y"), `amountCents`, `percent`, `tone`, `icon`, `note` |
| `CreateTransactionInput` (req) | `POST /transactions` | `accountId`, `categoryId?`, `description`, `direction` (inflow/outflow), `amountCents` (> 0), `occurredOn` (`YYYY-MM-DD`) |
| `UpdateTransactionInput` (req) | `PATCH /transactions/{id}` | igual ao Create **menos `accountId`** (não troca de conta) |
| `TransactionDetail` | `GET/POST/PATCH /transactions` | `id`, `accountId`, `categoryId`, `description`, `direction` (inflow/outflow), `amountCents`, `occurredOn`, `accountLabel`, `category`, `icon` |
| `CreateInstallmentInput` (req) | `POST /transactions/installment-purchases` | `accountId`, `categoryId?`, `description`, `amountCents` (**por parcela**, > 0), `totalInstallments` (2..48), `occurredOn` (1ª parcela) — sempre despesa |
| `CreateRecurringRuleInput` (req) | `POST /recurring-rules` | `accountId`, `categoryId?`, `description`, `direction` (inflow/outflow), `amountCents` (> 0), `frequency` (daily/weekly/monthly/yearly), `intervalCount` (≥1), `startDate`, `endDate?` **XOR** `maxOccurrences?` (ambos nulos = permanente) |
| `PortfolioSummary` | `/investimentos/summary` | `totalCents`, `gainCents`, `gainPct`, `title`, `quip` (geral, cripto fora) |
| `Position[]` | `/investimentos/positions` | `id`, `ticker`, `name`, `assetClass`, `icon`, `costBasisCents`, `currentValueCents`, `gainCents`, `gainPct`, `realizedCents` |
| `AllocationSlice[]` | `/investimentos/allocation` | `assetClass`, `label`, `valueCents`, `percent`, `tone` |
| `CryptoBlock` | `/investimentos/crypto` | `title`, `subtitle`, `subtotalCents`, `gainCents`, `gainPct`, `holdings[]` (`CryptoHolding`: `id`/`symbol`/`name`/`icon`/`costBasisCents`/`currentValueCents`/`gainCents`/`gainPct`/`series[]` de `{date, priceCents}` — mesmo shape do `PriceHistoryPoint`) |
| `EvolutionPoint[]` | `/investimentos/evolution` | `date` (YYYY-MM-DD), `marketValueCents`, `costBasisCents` — o gap entre as duas linhas = ganho não-realizado |
| `PriceHistoryPoint[]` | `/investimentos/assets/{id}/history` | `date` (YYYY-MM-DD), `priceCents` |
| `AssetPosition[]` | `/investimentos/assets` | metadados + `currentPriceCents`, `netQuantity` (**string**), `avgPriceCents`, `costBasisCents`, `currentValueCents`, `gainCents`, `gainPct`, `realizedCents` |
| `CreateAssetInput` (req) | `POST /investimentos/assets` | `ticker`, `name`, `assetClass` (acoes/fiis/renda_fixa/cripto), `icon`, `currentPriceCents` |
| `UpdateAssetInput` (req) | `PATCH /investimentos/assets/{id}` | igual ao Create **menos `assetClass`** (imutável) |
| `CreateTradeInput` (req) | `POST /investimentos/assets/{id}/trades` | `side` (buy/sell), `quantity` (**string decimal**, até 8 casas, > 0), `unitPriceCents`, `tradedOn` (YYYY-MM-DD), **`accountId`** (conta de liquidação, **obrigatória** — compra debita / venda credita) |
| `AssetDetail` | `GET/POST/PATCH /investimentos/assets/{id}` | `AssetPosition` + `trades[]` (`Trade`: `id`/`side`/`quantity`/`unitPriceCents`/`tradedOn`/**`accountId`** — vazio nos trades legados/seed sem caixa) |
| `Investment[]` | `/investments` | `id`, `name` (ticker), `valueCents` (valor atual), `dailyChangePct` (= ganho% acumulado — sem cotação diária), `icon` — derivado das posições da carteira |
| `InvestmentsSummary` | `/dashboard/investments-summary` | `totalCents`, `changeCents`, `changePct` — agregado das posições da carteira |

## Decisões em aberto
- [x] Layout de pacotes: `cmd/` + `internal/<domínio>/` + `test/`.
- [x] Pacote `internal/config` para env vars.
- [ ] Middleware de logging/erro (hoje cada handler loga e responde mensagem segura).
