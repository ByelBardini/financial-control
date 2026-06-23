-- Queries da carteira de Investimentos. Dinheiro em centavos (bigint) com cast no SQL;
-- QUANTIDADE é fracionária (numeric(28,8)) e trafega como STRING decimal (sqlc → pgtype.Numeric).
-- A posição (preço médio móvel, custo, valor, realizado) é DERIVADA das operações via CTE
-- recursiva — a venda remove ao preço médio do momento, então é path-dependent (não dá SUM).
-- Tudo escopado por user_id (isolamento nos dois lados de cada join).

-- name: ListPositions :many
-- Posição derivada de cada ativo (preço médio móvel). include_crypto/only_crypto separam o
-- portfólio geral da cripto; asset_id (opcional) restringe a um ativo (detalhe). Dinheiro em
-- centavos; net_quantity como string (8 casas). gainCents é calculado no Go (current - cost).
WITH RECURSIVE seq AS (
    SELECT
        t.asset_id,
        t.side,
        t.quantity,
        t.unit_price,
        row_number() OVER (PARTITION BY t.asset_id ORDER BY t.traded_on, t.created_at, t.id) AS rn
    FROM investment_trades t
    WHERE t.user_id = sqlc.arg(user_id)
),
replay AS (
    SELECT
        s.asset_id,
        s.rn,
        CASE WHEN s.side = 'buy' THEN s.quantity ELSE -s.quantity END                  AS rem_qty,
        CASE WHEN s.side = 'buy' THEN s.quantity * s.unit_price ELSE 0 END              AS rem_cost,
        0::numeric                                                                      AS realized
    FROM seq s
    WHERE s.rn = 1
    UNION ALL
    SELECT
        s.asset_id,
        s.rn,
        CASE WHEN s.side = 'buy' THEN r.rem_qty + s.quantity ELSE r.rem_qty - s.quantity END,
        CASE WHEN s.side = 'buy'
             THEN r.rem_cost + s.quantity * s.unit_price
             ELSE r.rem_cost - (r.rem_cost / NULLIF(r.rem_qty, 0)) * s.quantity END,
        CASE WHEN s.side = 'sell'
             THEN (s.unit_price - r.rem_cost / NULLIF(r.rem_qty, 0)) * s.quantity
             ELSE 0 END
    FROM seq s
    JOIN replay r ON s.asset_id = r.asset_id AND s.rn = r.rn + 1
),
final AS (
    SELECT DISTINCT ON (asset_id) asset_id, rem_qty, rem_cost
    FROM replay
    ORDER BY asset_id, rn DESC
),
realized_sum AS (
    SELECT asset_id, SUM(realized) AS realized FROM replay GROUP BY asset_id
)
SELECT
    a.id::text                                                                          AS id,
    a.ticker                                                                            AS ticker,
    a.name                                                                              AS name,
    a.asset_class                                                                       AS asset_class,
    a.icon                                                                              AS icon,
    (a.current_price * 100)::bigint                                                     AS current_price_cents,
    trim(to_char(COALESCE(f.rem_qty, 0), 'FM999999999990.00000000'))                    AS net_quantity,
    (round(COALESCE(f.rem_cost, 0) * 100))::bigint                                       AS cost_basis_cents,
    (round(COALESCE(f.rem_qty, 0) * a.current_price * 100))::bigint                      AS current_value_cents,
    (round(CASE WHEN COALESCE(f.rem_qty, 0) > 0 THEN f.rem_cost / f.rem_qty ELSE 0 END * 100))::bigint AS avg_price_cents,
    (round(COALESCE(rs.realized, 0) * 100))::bigint                                      AS realized_cents
FROM investment_assets a
LEFT JOIN final f         ON f.asset_id = a.id
LEFT JOIN realized_sum rs ON rs.asset_id = a.id
WHERE a.user_id = sqlc.arg(user_id)
  AND a.is_archived = false
  AND (sqlc.narg(asset_id)::uuid IS NULL OR a.id = sqlc.narg(asset_id))
  AND (sqlc.arg(include_crypto)::boolean OR a.asset_class <> 'cripto')
  AND (NOT sqlc.arg(only_crypto)::boolean OR a.asset_class = 'cripto')
ORDER BY a.asset_class, a.ticker;

-- name: ListCryptoSeries :many
-- Histórico de preço (centavos) dos ativos de cripto do usuário, em ordem cronológica.
-- O service agrupa por asset_id pra montar o `series` de cada CryptoHolding.
SELECT
    p.asset_id::text          AS asset_id,
    (p.price * 100)::bigint    AS price_cents
FROM investment_prices p
JOIN investment_assets a ON a.id = p.asset_id AND a.user_id = p.user_id
WHERE p.user_id = sqlc.arg(user_id)
  AND a.asset_class = 'cripto'
  AND a.is_archived = false
ORDER BY p.asset_id, p.observed_on, p.created_at;

-- name: GetAssetNetQuantity :one
-- Quantidade líquida atual de um ativo (Σbuy − Σsell) como string — backstop de mensagem
-- no erro de venda insuficiente. Sempre devolve uma linha (0 quando não há operações).
SELECT trim(to_char(
    COALESCE(SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END), 0),
    'FM999999999990.00000000')) AS net_quantity
FROM investment_trades t
WHERE t.asset_id = sqlc.arg(asset_id)
  AND t.user_id = sqlc.arg(user_id);

-- name: GetAssetByID :one
-- Metadados do ativo (escopado por id + user). ErrNoRows quando não é do usuário ou arquivado.
SELECT
    a.id::text                       AS id,
    a.ticker                         AS ticker,
    a.name                           AS name,
    a.asset_class                    AS asset_class,
    a.icon                           AS icon,
    (a.current_price * 100)::bigint  AS current_price_cents
FROM investment_assets a
WHERE a.id = sqlc.arg(id)
  AND a.user_id = sqlc.arg(user_id)
  AND a.is_archived = false;

-- name: ListTradesByAsset :many
-- Operações de um ativo (escopado por asset + user), em ordem cronológica. Quantidade como string.
-- account_id = conta de liquidação (vazio nos trades legados/seed sem caixa).
SELECT
    t.id::text                                                  AS id,
    t.side                                                      AS side,
    trim(to_char(t.quantity, 'FM999999999990.00000000'))        AS quantity,
    (t.unit_price * 100)::bigint                                AS unit_price_cents,
    t.traded_on                                                 AS traded_on,
    COALESCE(t.account_id::text, '')::text                      AS account_id
FROM investment_trades t
WHERE t.asset_id = sqlc.arg(asset_id)
  AND t.user_id = sqlc.arg(user_id)
ORDER BY t.traded_on, t.created_at, t.id;

-- name: CreateAsset :one
-- Cria um ativo do usuário (preço atual em centavos → NUMERIC na borda). Devolve o novo id.
INSERT INTO investment_assets (user_id, ticker, name, asset_class, icon, current_price)
VALUES (
    sqlc.arg(user_id),
    sqlc.arg(ticker),
    sqlc.arg(name),
    sqlc.arg(asset_class),
    sqlc.arg(icon),
    (sqlc.arg(current_price_cents)::bigint)::numeric / 100
)
RETURNING id::text AS id;

-- name: UpdateAsset :one
-- Edita metadados do ativo (NÃO troca asset_class) + o preço atual (escopado por id + user).
-- RETURNING vazio (ErrNoRows → 404) quando não é do usuário ou está arquivado.
UPDATE investment_assets SET
    ticker        = sqlc.arg(ticker),
    name          = sqlc.arg(name),
    icon          = sqlc.arg(icon),
    current_price = (sqlc.arg(current_price_cents)::bigint)::numeric / 100
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
  AND is_archived = false
RETURNING id::text AS id;

-- name: ArchiveAsset :one
-- Soft-delete do ativo (escopado por id + user). ErrNoRows → 404.
UPDATE investment_assets SET is_archived = true
WHERE id = sqlc.arg(id)
  AND user_id = sqlc.arg(user_id)
  AND is_archived = false
RETURNING id::text AS id;

-- name: AppendPriceObservation :execrows
-- Grava um ponto de histórico de preço (centavos → NUMERIC). Só se o ativo é do usuário.
INSERT INTO investment_prices (user_id, asset_id, price, observed_on)
SELECT
    sqlc.arg(user_id),
    sqlc.arg(asset_id),
    (sqlc.arg(price_cents)::bigint)::numeric / 100,
    sqlc.arg(observed_on)
WHERE EXISTS (
    SELECT 1 FROM investment_assets
    WHERE id = sqlc.arg(asset_id) AND user_id = sqlc.arg(user_id) AND is_archived = false
);

-- name: BuyTrade :one
-- Registra uma compra (liquida na conta account_id). Só insere se o ativo é do usuário.
-- ErrNoRows → ativo inválido. Quantidade NUMERIC (string no Go); preço em centavos → NUMERIC.
INSERT INTO investment_trades (user_id, asset_id, account_id, side, quantity, unit_price, traded_on)
SELECT
    sqlc.arg(user_id),
    sqlc.arg(asset_id),
    sqlc.arg(account_id),
    'buy',
    sqlc.arg(quantity)::numeric,
    (sqlc.arg(unit_price_cents)::bigint)::numeric / 100,
    sqlc.arg(traded_on)
WHERE EXISTS (
    SELECT 1 FROM investment_assets
    WHERE id = sqlc.arg(asset_id) AND user_id = sqlc.arg(user_id) AND is_archived = false
)
RETURNING id::text AS id;

-- name: SellTrade :one
-- Registra uma venda (liquida na conta account_id) COM guarda de saldo no próprio INSERT: só
-- insere se a quantidade vendida não excede a posição líquida (Σbuy − Σsell). ErrNoRows → ativo
-- inválido OU quantidade insuficiente (o service decide 404 vs 400 carregando o ativo antes).
INSERT INTO investment_trades (user_id, asset_id, account_id, side, quantity, unit_price, traded_on)
SELECT
    sqlc.arg(user_id),
    sqlc.arg(asset_id),
    sqlc.arg(account_id),
    'sell',
    sqlc.arg(quantity)::numeric,
    (sqlc.arg(unit_price_cents)::bigint)::numeric / 100,
    sqlc.arg(traded_on)
WHERE EXISTS (
    SELECT 1 FROM investment_assets
    WHERE id = sqlc.arg(asset_id) AND user_id = sqlc.arg(user_id) AND is_archived = false
)
  AND sqlc.arg(quantity)::numeric <= COALESCE((
    SELECT SUM(CASE WHEN t.side = 'buy' THEN t.quantity ELSE -t.quantity END)
    FROM investment_trades t
    WHERE t.asset_id = sqlc.arg(asset_id) AND t.user_id = sqlc.arg(user_id)
  ), 0)
RETURNING id::text AS id;

-- name: CreateInvestmentTransaction :one
-- Cria a transação de caixa (kind='investment') ligada a um trade, na conta dele. amount =
-- quantidade × preço (NUMERIC, 2 casas); direction 'expense' (compra) / 'income' (venda). ErrNoRows
-- → conta do trade inválida/arquivada. investment_trade_id liga ao trade (cascade no delete dele).
INSERT INTO transactions (user_id, account_id, description, kind, direction, amount, occurred_on, investment_trade_id)
SELECT
    t.user_id,
    t.account_id,
    sqlc.arg(description),
    'investment',
    sqlc.arg(direction),
    round(t.quantity * t.unit_price, 2),
    t.traded_on,
    t.id
FROM investment_trades t
WHERE t.id = sqlc.arg(trade_id)
  AND t.user_id = sqlc.arg(user_id)
  AND EXISTS (
    SELECT 1 FROM accounts
    WHERE id = t.account_id AND user_id = sqlc.arg(user_id) AND is_archived = false
  )
RETURNING id::text AS id;

-- name: DeleteTrade :one
-- Exclui uma operação (escopada por id + asset + user). A posição recomputa no próximo read.
-- ErrNoRows → 404.
DELETE FROM investment_trades
WHERE id = sqlc.arg(trade_id)
  AND asset_id = sqlc.arg(asset_id)
  AND user_id = sqlc.arg(user_id)
RETURNING id::text AS id;
