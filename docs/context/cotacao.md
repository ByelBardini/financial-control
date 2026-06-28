# Cotação (preços externos)

> Leia antes de mexer em `server/internal/cotacao` ou em qualquer ingestão de preço.
> Dinheiro em centavos `int64`; ver `money.md`. Alimenta o ledger `investment_prices`
> (ver `investimentos.md` e `database.md`).

## Para que serve
Camada que busca **preço de mercado** de ativos e normaliza em **centavos BRL**. Embrulha
provedores externos atrás de uma interface própria (`FonteDePreco`) — o resto do app não
conhece brapi/CoinGecko, só a interface. É o **provider**; quem grava no banco é a Fase de
store/worker (backfill no cadastro + job diário EOD).

## Fontes (grátis)
- **brapi.dev** — ações e FIIs da B3, BRL nativo. `GET /api/quote/{tickers}` (lista separada
  por vírgula = **1 request pra carteira toda**) e `GET /api/quote/{ticker}?range=&interval=1d`
  pro histórico. Precisa de `BRAPI_TOKEN` (4 tickers de teste funcionam sem). Pesquisa completa
  de alternativas na memória `free-market-data-apis`.
- **CoinGecko** — cripto, `vs_currency=brl` (sem conversão). `/api/v3/simple/price` (batch) e
  `/api/v3/coins/{id}/market_chart` (histórico). Chave Demo opcional (`COINGECKO_API_KEY`).
- **Renda fixa NÃO tem cotação automática** — valorização dela é acúmulo por índice, não preço.
  `Resolver.Para("renda_fixa")` devolve `(nil,false)`.

## Interface (`cotacao.go`)
```go
type FonteDePreco interface {
    UltimosPrecos(ctx, tickers []string) (map[string]Cotacao, error) // batch
    Historico(ctx, ticker string, de, ate time.Time) ([]PontoDePreco, error)
}
```
- `Cotacao{PriceCents int64; AsOf time.Time; Source string}` — último preço + instante do provedor.
- `PontoDePreco{ObservedOn time.Time; PriceCents int64; Source string}` — fechamento de um dia.
- `Resolver` mapeia `asset_class → fonte`: `acoes`/`fiis` → brapi; `cripto` → CoinGecko.

## Decisões travadas (o ponto técnico)
1. **Batch-first**: `UltimosPrecos` recebe **lista** de tickers — 1 request por classe no job
   diário, não N. Não reintroduzir versão singular (estoura o free-tier).
2. **Centavos exatos sem float**: preço decimal do JSON → `big.Rat` → centavos com arredondamento
   meio-pra-cima (`centsFromDecimal`). Nunca `float64` pra dinheiro (`money.md`).
3. **Close NÃO-ajustado**: na brapi usamos `close`, **nunca** `adjustedClose`. Bonificação/split
   já entram como **trade de preço 0** no domínio (ver `investimentos.md`); usar preço ajustado
   contaria o ajuste duas vezes. **Não "consertar" pra ajustado.**
4. **Data em BRT (UTC-3 fixo)**: `observed_on` = dia de Brasília. Usa `time.FixedZone("BRT",-3h)`
   (Brasil sem horário de verão desde 2019) — não depende de tzdata do SO.
5. **Resiliência**: `http.Client` com timeout (nunca sem), 1 retry em 429/5xx honrando
   `Retry-After`. Erros usam um *label* (ex.: "brapi quote") em vez da URL — o token vai na query
   e **não pode vazar em log**.
6. **Ticker→id da cripto**: CoinGecko usa id (`bitcoin`), não símbolo. `IDPadrao` tem os mais
   comuns (BTC, ETH, …); ticker fora da tabela fica sem cotação automática. Ampliar conforme a
   carteira crescer.

## Quem usa o provider
- **Backfill no cadastro** (`internal/investimentos`, `CreateAsset`): puxa ~1 ano de histórico em goroutine best-effort.
- **Job diário EOD** (`internal/precojob`): worker à parte (fora do `cotacao`, que segue provider puro) que, no horário (`QUOTE_JOB_AT`, BRT, opt-in via `QUOTE_JOB_ENABLED`), agrupa os ativos cotáveis por classe, busca o último preço em **lote** (`Resolver.UltimosPrecos`) e grava o fechamento (`store.RecordDailyClose`). Isola falha por ticker/classe; clock injetável (`now func() time.Time`) p/ testes.

## Fora de escopo (aqui)
Evolução do patrimônio (derivação `trades × prices`) fica na fase de leitura. Fallback Yahoo `.SA` /
Mercado Bitcoin e benchmark CDI/IBOV são evolução futura.
