# Investimentos (domínio)

> Leia antes de mexer na carteira de investimentos (server `internal/investimentos`, schema
> `investment_*`, tela `client/.../investimentos`). Dinheiro em centavos; ver `money.md` e `database.md`.

## Conceito

Carteira de investimentos no mesmo princípio do resto do app: **derivar, nunca cachear**. Assim como o
**saldo de conta** é derivado do ledger (`opening_balance + SUM(signed_amount)`), a **posição de um ativo**
é derivada das **operações** (compras/vendas). Três tabelas (migration `00005`):

- **`investment_assets`** — o ativo: `ticker`, `name`, `asset_class` (`acoes`/`fiis`/`renda_fixa`/`cripto`),
  `icon`, `current_price` (NUMERIC — **último fechamento**: para classes cotadas é o **cache** do close do
  job diário; PATCH manual é override que vale até o próximo run; **renda_fixa é sempre manual**), `is_archived`.
- **`investment_trades`** — **fatos crus**: `side` (`buy`/`sell`), `quantity` (`NUMERIC(28,8)`, fracionária
  p/ cripto), `unit_price`, `traded_on`. Append-only; editar/excluir é livre (a posição recomputa no read).
- **`investment_prices`** — **ledger de preço diário (EOD)**: no máximo **1 fechamento por ativo por dia**
  (`UNIQUE(asset_id, observed_on)`, migration `00007`), com `source` (`manual`/`brapi`/`coingecko`) e
  `as_of` (instante da cotação do provedor). Alimenta o `series` do gráfico da cripto e o histórico de
  preço. Gravação é **upsert** (`AppendPriceObservation` no PATCH manual, `UpsertDailyPrice`/`RecordDailyClose`
  na cotação automática) — editar 2× no mesmo dia atualiza a linha, não duplica. Ver `cotacao.md`.

## Posição derivada (preço médio móvel) — o ponto técnico

A posição (`net_quantity`, **preço médio**, custo, valor atual, **resultado realizado**) sai de uma
**CTE recursiva** (`ListPositions` em `db/queries/investimentos.sql`) que replica as operações **em ordem
cronológica** (`traded_on, created_at, id`): em cada compra `qty+=q; cost+=q*price`; em cada venda
`avg=cost/qty; realized+=(price-avg)*q; cost-=avg*q; qty-=q`.

**Por que recursivo (e não um `SUM` simples):** no preço médio móvel a venda remove unidades **ao preço
médio do momento**, então o custo restante e o realizado são **path-dependent** quando compras e vendas se
**intercalam**. Ex.: buy 10@5 → buy 10@7 (avg 6) → **sell 15** (avg fica 6, qtd 5) → buy 5@8 → **avg 7,00**.
A fórmula "média só das compras" daria 6,40 (errado). Há teste de integração que crava isso
(`server/test/investimentos_integration_test.go`, subteste "intercaladas").

- `net_quantity` e `current_value` (= `qty × current_price`) seriam simples; **custo e realizado exigem o replay**.
- Toda a aritmética é **NUMERIC no SQL**; o Go recebe dinheiro em **centavos `int64`** e quantidade como
  **string decimal** (sem lib decimal, sem `float`; ver `money.md`).

## Decisões de produto (travadas)

1. **Operações + posição derivada** (preço médio móvel) — padrão de mercado (corretora/Kinvo).
2. **Liquidação em conta** (migration `00006`, reverte a "carteira isolada") — toda operação **debita**
   (compra) / **credita** (venda) uma **conta escolhida** (`accountId` obrigatório). Atomicamente
   (`pgx.Tx` via `q.WithTx`) cria uma `transactions` `kind='investment'` na conta (`amount = qtd × preço`,
   compra→`expense`, venda→`income`, `investment_trade_id` ligando ao trade). Excluir o trade **cascata** a
   transação (reverte o caixa). Esse movimento **mexe no saldo** e **aparece no extrato** (etiqueta
   `Investimento`), mas é **excluído do resumo do mês** (`GetMonthSummary`/`ListCategorySpend` filtram
   `kind <> 'investment'`) — aporte/resgate não é gasto/renda. Preço 0 (bonificação) → trade sem caixa.
   Conta inexistente/arquivada → **400**.
3. **Valor atual por preço manual** por ativo (`current_value = net_quantity × current_price`).
4. **Resultado realizado** nas vendas + **histórico de preço** da cripto. **Sem** taxas/corretagem (v1).
5. **Cripto à parte**: `asset_class='cripto'` é **excluída** do resumo/posições/alocação geral; tem bloco e
   subtotal próprios (`/investimentos/crypto`). É uma classe nas mesmas tabelas, só agrupada separada na API.
6. **Risco fica no client**: o veredito ácido (`assessRisk`) é derivado de `summary.gainPct` no front — a
   cópia humorada **não** foi portada pro Go.

## Endpoints (todos `/investimentos/*`, protegidos)

**Views (alimentam a tela; shape 1:1 com `client/src/types/investimentos.ts`):**
`GET /summary` (PortfolioSummary, geral), `/positions` (Position[] abertas, geral), `/allocation`
(AllocationSlice[], geral), `/crypto` (CryptoBlock à parte; `series` agora é `{date, priceCents}[]` — data +
preço por ponto), `/evolution` (EvolutionPoint[] — **valor de mercado × custo acumulado** por dia, com
**forward-fill** em dias sem pregão; **sem preço no ledger, o mercado cai no `current_price`** (manual) pra
bater com as posições, em vez de zerar; exclui cripto; `?range=` 1mo/3mo/6mo/1y/max, default 6mo — é o gráfico
de "valorizou ou não?").

**Catálogo (autocomplete do cadastro):** `GET /catalogo?class=<acoes|fiis|cripto>&q=<texto>` → `CatalogoItem[]`
(`{ticker, name, priceCents, logoUrl?}`, sempre array). Busca ativos reais no catálogo externo (brapi p/ ações/FIIs,
CoinGecko p/ cripto) pro campo de Ticker sugerir enquanto o usuário digita. `[]` (200) em renda_fixa / query < 2 chars
/ sem buscador / sem match; **400** classe inválida; `limit` fixo 10 (cota). `Service.Catalogo` valida e delega ao
`Buscador` (interface — `*cotacao.Resolver` implementa via `Buscar`; injetado por `ComBusca`, espelhando `ComBackfill`).
Mapeamento + structs de busca em `cotacao/busca.go` (ver `cotacao.md`); o preço só vem nas ações/FIIs (brapi `close`),
cripto entra sem preço. DTO/validação em `internal/investimentos/catalogo.go`.

**Recurso (gestão + compra/venda):** `GET/POST /assets`, `GET/PATCH/DELETE /assets/{id}`,
`GET /assets/{id}/history` (PriceHistoryPoint[] — série diária de preço do ativo; `?range=`)
(PATCH edita metadados + `current_price`; classe **imutável**; preço novo grava `investment_prices`),
`POST /assets/{id}/trades` (buy/sell — corpo exige **`accountId`** (conta de liquidação); venda > posição →
**400**, guarda no próprio INSERT; conta inválida/arquivada → **400**), `DELETE /assets/{id}/trades/{tradeId}`
(posição recomputa + **cascata** a transação de caixa). O detalhe (`AssetDetail.trades[]`) traz o `accountId`
de cada operação. DTOs e validação em `internal/investimentos/crud.go`.

**UI de compra/venda (client):** o form **pré-preenche o preço unitário** com o `currentPrice` do ativo
(editável). O usuário informa por **quantidade** (o total sai do preço) ou — toggle **só em cripto**, que
abre nele — por **valor em R$** (a quantidade = valor ÷ preço é derivada **no client**, 8 casas). O corpo
enviado é **sempre** `quantity` + `unitPriceCents` — o backend não muda; o `amount` (caixa) segue `qtd ×
preço` em NUMERIC no SQL.

**Bloco "Investimentos" da Início** (`/investments`, `/dashboard/investments-summary` + o `investidoCents`
do `/dashboard/summary`) agora **deriva desta carteira** (o `dashboard.Service` lê `ListPositions`,
carteira inteira) — não são mais stubs. O stub `/dashboard/ticker` foi **removido**. Essa tela
(`/investimentos/*`) segue sendo a fonte; a Início é um resumo dela.

## Camadas / arquivos

`internal/investimentos/`: `investimentos.go` (Service + interface `InvestimentosStore` + DTOs de view +
Summary/Positions/Allocation/Crypto + `NewService(store, ...Option)` com `ComBackfill`), `crud.go` (DTOs de
escrita + validação + CRUD de ativo/operação; `Trade` carrega o ativo p/ 404 + ticker e delega ao store),
`personality.go` (títulos/labels/tons/quips — PLACEHOLDER), `handlers.go` (handlers + mapeamento de erro: 404
ativo/operação, 400 venda insuficiente / conta inválida). Dados em `internal/store/investimentos.go`
(`RecordTrade` abre a `pgx.Tx`: insere o trade + a transação de caixa, commit atômico) + `db/queries/investimentos.sql`.

**Cotação automática (provider `internal/cotacao`, ver `cotacao.md`):** ao **criar** um ativo, `CreateAsset`
dispara um **backfill assíncrono** (goroutine, contexto próprio, **best-effort** — não bloqueia o request nem
falha o cadastro) que puxa ~1 ano de histórico (`Cotador.Historico`) e grava via `UpsertDailyPrices`. Ativos
**já existentes** (de antes da feature) ganham série via `POST /investimentos/backfill` (`BackfillExistentes`:
itera os cotáveis do usuário em background, sequencial; rodar 1× após configurar o token). O `Service`
recebe o `cotacao.Resolver` por `ComBackfill` (sem ele, cadastro não busca preço). Config: `BRAPI_TOKEN` e
`COINGECKO_API_KEY` (ambos **fail-soft** — ausentes não impedem o server subir). PATCH de preço grava o ponto do
dia em **data de Brasília** (`cotacao.DataBRT`, não UTC).

## Fora de escopo (v1)
Taxas/corretagem; materialização de proventos/dividendos; editar trade via PATCH (hoje só criar/excluir — a
posição recomputa de qualquer jeito). Cotação ao vivo intradiária (B3/cripto) segue fora — o que há é o
fechamento EOD do job + backfill (ver `cotacao.md`).
