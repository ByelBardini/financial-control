-- +goose Up
-- investment_prices vira um ledger de preço DIÁRIO (EOD): no máximo 1 fechamento por ativo por
-- dia, com proveniência (source) e o instante da cotação do provedor (as_of, distinto de created_at
-- = momento da ingestão). Antes era append a cada PATCH de preço (podia ter várias linhas/dia).
-- Ver docs/context/cotacao.md e investimentos.md.

ALTER TABLE investment_prices
    ADD COLUMN source text        NOT NULL DEFAULT 'manual',
    ADD COLUMN as_of  timestamptz;

-- Deduplica observações do mesmo dia (mantém a mais recente) antes do índice único.
DELETE FROM investment_prices p
USING investment_prices q
WHERE p.asset_id = q.asset_id
  AND p.observed_on = q.observed_on
  AND (p.created_at, p.id) < (q.created_at, q.id);

-- 1 fechamento por ativo por dia. UNIQUE habilita o upsert (ON CONFLICT) e serve de índice de
-- leitura por (asset_id, observed_on) — substitui o índice não-único anterior.
DROP INDEX IF EXISTS idx_investment_prices_asset;
CREATE UNIQUE INDEX investment_prices_asset_day_key
    ON investment_prices (asset_id, observed_on);

-- +goose Down
DROP INDEX IF EXISTS investment_prices_asset_day_key;
CREATE INDEX idx_investment_prices_asset ON investment_prices (asset_id, observed_on);
ALTER TABLE investment_prices
    DROP COLUMN IF EXISTS as_of,
    DROP COLUMN IF EXISTS source;
