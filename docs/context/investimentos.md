# Investimentos (domínio)

> Leia antes de mexer na carteira de investimentos (server `internal/investimentos`, schema
> `investment_*`, tela `client/.../investimentos`). Dinheiro em centavos; ver `money.md` e `database.md`.

## Conceito

Carteira de investimentos no mesmo princípio do resto do app: **derivar, nunca cachear**. Assim como o
**saldo de conta** é derivado do ledger (`opening_balance + SUM(signed_amount)`), a **posição de um ativo**
é derivada das **operações** (compras/vendas). Três tabelas (migration `00005`):

- **`investment_assets`** — o ativo: `ticker`, `name`, `asset_class` (`acoes`/`fiis`/`renda_fixa`/`cripto`),
  `icon`, `current_price` (NUMERIC — "último preço" **manual**, sem cotação ao vivo), `is_archived`.
- **`investment_trades`** — **fatos crus**: `side` (`buy`/`sell`), `quantity` (`NUMERIC(28,8)`, fracionária
  p/ cripto), `unit_price`, `traded_on`. Append-only; editar/excluir é livre (a posição recomputa no read).
- **`investment_prices`** — histórico de preço (alimenta o `series` do gráfico da cripto); uma linha é
  gravada quando o `current_price` muda (PATCH do ativo).

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
(AllocationSlice[], geral), `/crypto` (CryptoBlock à parte, `series` do histórico).

**Recurso (gestão + compra/venda):** `GET/POST /assets`, `GET/PATCH/DELETE /assets/{id}`
(PATCH edita metadados + `current_price`; classe **imutável**; preço novo grava `investment_prices`),
`POST /assets/{id}/trades` (buy/sell — corpo exige **`accountId`** (conta de liquidação); venda > posição →
**400**, guarda no próprio INSERT; conta inválida/arquivada → **400**), `DELETE /assets/{id}/trades/{tradeId}`
(posição recomputa + **cascata** a transação de caixa). O detalhe (`AssetDetail.trades[]`) traz o `accountId`
de cada operação. DTOs e validação em `internal/investimentos/crud.go`.

**Não confundir** com os stubs do Dashboard (`/investments`, `/dashboard/investments-summary`,
`/dashboard/ticker`) — são do bloco "Investimentos (Risos)" da Início, intactos e separados desta tela.

## Camadas / arquivos

`internal/investimentos/`: `investimentos.go` (Service + interface `InvestimentosStore` + DTOs de view +
Summary/Positions/Allocation/Crypto), `crud.go` (DTOs de escrita + validação + CRUD de ativo/operação;
`Trade` carrega o ativo p/ 404 + ticker e delega ao store), `personality.go` (títulos/labels/tons/quips —
PLACEHOLDER), `handlers.go` (handlers + mapeamento de erro: 404 ativo/operação, 400 venda insuficiente /
conta inválida). Dados em `internal/store/investimentos.go` (`RecordTrade` abre a `pgx.Tx`: insere o trade +
a transação de caixa, commit atômico) + `db/queries/investimentos.sql`.

## Fora de escopo (v1)
Taxas/corretagem; cotação ao vivo (cripto/B3); materialização de proventos/dividendos; editar trade via
PATCH (hoje só criar/excluir — a posição recomputa de qualquer jeito); ligar o `investidoCents` do Dashboard
e os stubs `/investments`/ticker à carteira real.
